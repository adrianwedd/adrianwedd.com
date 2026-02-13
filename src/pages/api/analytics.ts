// Analytics API endpoint — serves aggregate GA4 data
// TODO: Integrate with GA4 Data API when credentials are configured
export const prerender = false;

type AnalyticsData = {
  period: { start: string; end: string };
  overview: {
    totalPageviews: number;
    totalUsers: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  topContent: Array<{
    path: string;
    title: string;
    views: number;
    avgTimeOnPage: number;
  }>;
  topProjects: Array<{
    name: string;
    clicks: number;
    views: number;
  }>;
  geography: Array<{
    country: string;
    users: number;
    percentage: number;
  }>;
  devices: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  referrers: Array<{
    source: string;
    type: string;
    users: number;
  }>;
  engagement: {
    scrollDepth: { avg: number; distribution: Record<string, number> };
    readingTime: { avg: number; distribution: Record<string, number> };
    audioPlays: number;
    galleryViews: number;
  };
};

// TODO: Replace with GA4 Data API integration
async function fetchGA4Data(): Promise<AnalyticsData> {
  // Mock data for development — replace with real GA4 API calls
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    period: {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    overview: {
      totalPageviews: 12847,
      totalUsers: 4293,
      avgSessionDuration: 142,
      bounceRate: 38.2,
    },
    topContent: [
      {
        path: '/',
        title: 'Home',
        views: 3421,
        avgTimeOnPage: 68,
      },
      {
        path: '/projects/adhdo/',
        title: 'ADHDo',
        views: 1847,
        avgTimeOnPage: 203,
      },
      {
        path: '/blog/hello-world/',
        title: 'Hello World',
        views: 1243,
        avgTimeOnPage: 156,
      },
      {
        path: '/projects/this-wasnt-in-the-brochure/',
        title: "This Wasn't in the Brochure",
        views: 982,
        avgTimeOnPage: 287,
      },
      {
        path: '/about/',
        title: 'About',
        views: 743,
        avgTimeOnPage: 91,
      },
    ],
    topProjects: [
      { name: 'ADHDo', clicks: 427, views: 1847 },
      { name: "This Wasn't in the Brochure", clicks: 312, views: 982 },
      { name: 'failure-first', clicks: 198, views: 671 },
      { name: 'Afterglow Engine', clicks: 143, views: 524 },
      { name: 'ordr.fm', clicks: 89, views: 412 },
    ],
    geography: [
      { country: 'United States', users: 1284, percentage: 29.9 },
      { country: 'Australia', users: 987, percentage: 23.0 },
      { country: 'United Kingdom', users: 643, percentage: 15.0 },
      { country: 'Canada', users: 412, percentage: 9.6 },
      { country: 'Germany', users: 321, percentage: 7.5 },
      { country: 'Other', users: 646, percentage: 15.0 },
    ],
    devices: {
      mobile: 42.3,
      tablet: 8.7,
      desktop: 49.0,
    },
    referrers: [
      { source: 'Direct / None', type: 'direct', users: 1847 },
      { source: 'google.com', type: 'search', users: 1243 },
      { source: 'github.com', type: 'developer', users: 521 },
      { source: 'twitter.com', type: 'social', users: 387 },
      { source: 'linkedin.com', type: 'social', users: 295 },
    ],
    engagement: {
      scrollDepth: {
        avg: 67.3,
        distribution: { '25': 89, '50': 72, '75': 54, '100': 38 },
      },
      readingTime: {
        avg: 142,
        distribution: { '30s': 23, '1m': 41, '2m': 28, '5m': 8 },
      },
      audioPlays: 147,
      galleryViews: 284,
    },
  };
}

export async function GET() {
  try {
    const data = await fetchGA4Data();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
