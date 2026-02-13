// Analytics API — serves static mock data (no SSR needed).
// TODO: Replace with GA4 Data API client-side fetch or build-time generation.
export const prerender = true;

export async function GET() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const data = {
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
      { path: '/', title: 'Home', views: 3421, avgTimeOnPage: 68 },
      { path: '/projects/adhdo/', title: 'ADHDo', views: 1847, avgTimeOnPage: 203 },
      { path: '/blog/hello-world/', title: 'Hello World', views: 1243, avgTimeOnPage: 156 },
      { path: '/projects/this-wasnt-in-the-brochure/', title: "This Wasn't in the Brochure", views: 982, avgTimeOnPage: 287 },
      { path: '/about/', title: 'About', views: 743, avgTimeOnPage: 91 },
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
      readingTime: { avg: 142, distribution: { '30s': 23, '1m': 41, '2m': 28, '5m': 8 } },
      audioPlays: 147,
      galleryViews: 284,
    },
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
