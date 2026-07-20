#!/usr/bin/env node
// Fetches GA4 analytics data and writes to public/api/analytics.json.
// Falls back to mock data if credentials are unavailable (local dev without GA4).

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'public', 'api', 'analytics.json');

// --- Credential resolution ---

function getCredentials() {
  // 1. GA4_SERVICE_ACCOUNT_KEY env var (GitHub Actions)
  if (process.env.GA4_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY);
    } catch {
      console.error('Failed to parse GA4_SERVICE_ACCOUNT_KEY as JSON');
      return null;
    }
  }

  // 2. Local credentials file
  const localPath = join(__dirname, '..', '.ga4-credentials.json');
  if (existsSync(localPath)) {
    try {
      return JSON.parse(readFileSync(localPath, 'utf-8'));
    } catch {
      console.error('Failed to parse .ga4-credentials.json');
      return null;
    }
  }

  // 3. GOOGLE_APPLICATION_CREDENTIALS env var (standard)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      return JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
    } catch {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS file');
      return null;
    }
  }

  return null;
}

function getPropertyId() {
  return process.env.GA4_PROPERTY_ID || null;
}

// --- GA4 Data API ---

async function fetchGA4Data(credentials, propertyId) {
  const client = new BetaAnalyticsDataClient({ credentials });
  const property = `properties/${propertyId}`;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  // Trend charts need a longer window than the 30-day snapshot metrics.
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const trendStartDate = ninetyDaysAgo.toISOString().split('T')[0];

  // Run all reports in parallel
  const [overview, topPages, geography, devices, referrers, trend] = await Promise.all([
    // Overview metrics
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'engagedSessions' },
        { name: 'eventCount' },
      ],
    }),

    // Top pages by views
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    }),

    // Geography
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 6,
    }),

    // Devices
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'totalUsers' }],
    }),

    // Referrers
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 5,
    }),

    // Daily time series — the only query with a date dimension, and the sole
    // source for the trend charts. Ascending so the series plots left-to-right.
    client.runReport({
      property,
      dateRanges: [{ startDate: trendStartDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'engagedSessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      // Without this, GA4 drops rows whose metrics are all zero. The chart plots
      // rows as consecutive days, so a zero-traffic day would silently close the
      // gap and inflate the daily average.
      keepEmptyRows: true,
      limit: 100,
    }),
  ]);

  // --- Parse overview ---
  const overviewRow = overview[0]?.rows?.[0];
  const totalPageviews = parseInt(overviewRow?.metricValues?.[0]?.value || '0');
  const totalUsers = parseInt(overviewRow?.metricValues?.[1]?.value || '0');
  const avgSessionDuration = parseFloat(overviewRow?.metricValues?.[2]?.value || '0');
  const bounceRate = parseFloat(overviewRow?.metricValues?.[3]?.value || '0') * 100;

  // --- Parse top pages ---
  const topPagesRows = topPages[0]?.rows || [];
  const topContent = [];
  const topProjects = [];

  for (const row of topPagesRows) {
    const path = row.dimensionValues[0].value;
    const title = row.dimensionValues[1].value || path;
    const views = parseInt(row.metricValues[0].value);
    const avgTimeOnPage = parseFloat(row.metricValues[1].value);

    if (topContent.length < 10) {
      topContent.push({
        path,
        title: cleanTitle(title),
        views,
        avgTimeOnPage: Math.round(avgTimeOnPage),
      });
    }

    if (path.startsWith('/projects/') && path !== '/projects/' && topProjects.length < 5) {
      topProjects.push({
        name: cleanTitle(title),
        views,
      });
    }
  }

  // --- Parse geography ---
  const geoRows = geography[0]?.rows || [];
  const totalGeoUsers = geoRows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);
  const geoData = geoRows.map(row => {
    const users = parseInt(row.metricValues[0].value);
    return {
      country: row.dimensionValues[0].value,
      users,
      percentage: Math.round((users / totalGeoUsers) * 1000) / 10,
    };
  });

  // --- Parse devices ---
  const deviceRows = devices[0]?.rows || [];
  const totalDeviceUsers = deviceRows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);
  const deviceMap = { mobile: 0, tablet: 0, desktop: 0 };
  for (const row of deviceRows) {
    const category = row.dimensionValues[0].value.toLowerCase();
    const users = parseInt(row.metricValues[0].value);
    if (category in deviceMap) {
      deviceMap[category] = Math.round((users / totalDeviceUsers) * 1000) / 10;
    }
  }

  // --- Parse referrers ---
  const refRows = referrers[0]?.rows || [];
  const referrerData = refRows.map(row => {
    const source = row.dimensionValues[0].value || '(direct)';
    return {
      source: source === '(direct)' ? 'Direct / None' : source,
      type: classifyReferrer(source),
      users: parseInt(row.metricValues[0].value),
    };
  });

  // --- Engagement (from overview event counts, approximated) ---
  const eventCount = parseInt(overviewRow?.metricValues?.[5]?.value || '0');
  const engagedSessions = parseInt(overviewRow?.metricValues?.[4]?.value || '0');

  // --- Parse daily trend ---
  // GA4 returns the date dimension as YYYYMMDD; normalise to ISO so the client
  // never has to parse a bare 8-digit string.
  const trendSeries = (trend[0]?.rows || []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value || '';
    return {
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      pageviews: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      engagedSessions: parseInt(row.metricValues?.[2]?.value || '0'),
    };
  });

  return {
    period: { start: startDate, end: endDate },
    trend: { start: trendStartDate, end: endDate, series: trendSeries },
    overview: {
      totalPageviews,
      totalUsers,
      avgSessionDuration: Math.round(avgSessionDuration),
      bounceRate: Math.round(bounceRate * 10) / 10,
    },
    topContent,
    topProjects,
    geography: geoData,
    devices: deviceMap,
    referrers: referrerData,
    engagement: {
      // The site emits scroll_depth, audio_play and gallery_view events, but this
      // script does not query them yet. Emitting 0 published a false measurement
      // as fact; null means "not measured" and the dashboard renders it as such.
      scrollDepth: { avg: null, distribution: {} },
      avgSession: { avg: Math.round(avgSessionDuration), distribution: {} },
      audioPlays: null,
      galleryViews: null,
    },
  };
}

function cleanTitle(title) {
  // Remove site name suffix if present
  return title.replace(/\s*[|\-–—]\s*Adrian Wedd.*$/i, '').trim() || title;
}

function classifyReferrer(source) {
  if (source === '(direct)' || source === '(none)') return 'direct';
  if (/google|bing|duckduckgo|yahoo|baidu/i.test(source)) return 'search';
  if (/twitter|x\.com|facebook|linkedin|reddit|mastodon|threads|instagram/i.test(source)) return 'social';
  if (/github|gitlab|stackoverflow|dev\.to|hackernews|lobste/i.test(source)) return 'developer';
  return 'referral';
}

// --- Mock data fallback ---

function getMockData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Deterministic (no Math.random) so repeated builds don't churn the committed
  // file. Shaped, not realistic — the dashboard flags the whole payload as mock.
  // 91 points: the range is inclusive of both today and the day 90 days back,
  // so a 90-length series stopped at yesterday while declaring `end: today`.
  const mockSeries = Array.from({ length: 91 }, (_, i) => {
    const day = new Date(ninetyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const weekly = Math.sin((i / 7) * Math.PI * 2) * 18;
    const growth = i * 1.4;
    const pageviews = Math.max(12, Math.round(90 + growth + weekly));
    return {
      date: day.toISOString().split('T')[0],
      pageviews,
      users: Math.round(pageviews * 0.42),
      engagedSessions: Math.round(pageviews * 0.31),
    };
  });

  return {
    period: {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    trend: {
      start: ninetyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
      series: mockSeries,
    },
    overview: {
      totalPageviews: 12847,
      totalUsers: 4293,
      avgSessionDuration: 142,
      bounceRate: 38.2,
    },
    topContent: [
      { path: '/', title: 'Home', views: 3421, avgTimeOnPage: 68 },
      { path: '/projects/adhdo/', title: 'ADHDo', views: 1847, avgTimeOnPage: 203 },
      { path: '/blog/hello-world/', title: 'Hello World', views: 1243, avgTimeOnPage: 156 },
      { path: '/projects/this-wasnt-in-the-brochure/', title: "This Wasn't in the Brochure", views: 982, avgTimeOnPage: 287 },
      { path: '/about/', title: 'About', views: 743, avgTimeOnPage: 91 },
    ],
    topProjects: [
      { name: 'ADHDo', views: 1847 },
      { name: "This Wasn't in the Brochure", views: 982 },
      { name: 'failure-first', views: 671 },
      { name: 'Afterglow Engine', views: 524 },
      { name: 'ordr.fm', views: 412 },
    ],
    geography: [
      { country: 'United States', users: 1284, percentage: 29.9 },
      { country: 'Australia', users: 987, percentage: 23.0 },
      { country: 'United Kingdom', users: 643, percentage: 15.0 },
      { country: 'Canada', users: 412, percentage: 9.6 },
      { country: 'Germany', users: 321, percentage: 7.5 },
      { country: 'Other', users: 646, percentage: 15.0 },
    ],
    devices: { mobile: 42.3, tablet: 8.7, desktop: 49.0 },
    referrers: [
      { source: 'Direct / None', type: 'direct', users: 1847 },
      { source: 'google.com', type: 'search', users: 1243 },
      { source: 'github.com', type: 'developer', users: 521 },
      { source: 'twitter.com', type: 'social', users: 387 },
      { source: 'linkedin.com', type: 'social', users: 295 },
    ],
    engagement: {
      scrollDepth: { avg: 67.3, distribution: { '25': 89, '50': 72, '75': 54, '100': 38 } },
      avgSession: { avg: 142, distribution: { '30s': 23, '1m': 41, '2m': 28, '5m': 8 } },
      audioPlays: 147,
      galleryViews: 284,
    },
    _mock: true,
  };
}

// --- Main ---

async function main() {
  const credentials = getCredentials();
  const propertyId = getPropertyId();

  let data;

  if (credentials && propertyId) {
    console.log(`Fetching GA4 data for property ${propertyId}...`);
    try {
      data = await fetchGA4Data(credentials, propertyId);
      console.log(`Fetched real GA4 data: ${data.overview.totalPageviews} pageviews, ${data.overview.totalUsers} users`);
    } catch (err) {
      console.error('GA4 API error, falling back to mock data:', err.message);
      data = getMockData();
    }
  } else {
    if (!credentials) console.log('No GA4 credentials found');
    if (!propertyId) console.log('No GA4_PROPERTY_ID set');
    console.log('Using mock analytics data');
    data = getMockData();
  }

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Wrote analytics data to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  // Write mock data so build doesn't fail
  const data = getMockData();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log('Wrote mock fallback data due to error');
});
