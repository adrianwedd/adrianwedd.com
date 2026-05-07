import { useState, useEffect } from 'preact/hooks';

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

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div class="text-text-muted py-12 text-center">Loading analytics data...</div>;
  }

  if (error) {
    return (
      <div class="border-border bg-surface-alt rounded border p-6 text-center">
        <p class="text-text-muted mb-2">Failed to load analytics data</p>
        <p class="text-text-muted text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div class="space-y-8">
      {/* Period indicator */}
      <div class="text-text-muted text-sm">
        Data from {new Date(data.period.start).toLocaleDateString()} to {new Date(data.period.end).toLocaleDateString()}
      </div>

      {/* Overview metrics */}
      <section>
        <h2 class="mb-4 text-2xl font-bold">Overview</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Pageviews" value={data.overview.totalPageviews.toLocaleString()} />
          <MetricCard label="Unique Visitors" value={data.overview.totalUsers.toLocaleString()} />
          <MetricCard label="Avg. Session Duration" value={formatDuration(data.overview.avgSessionDuration)} />
          <MetricCard label="Bounce Rate" value={`${data.overview.bounceRate.toFixed(1)}%`} />
        </div>
      </section>

      {/* Top content */}
      <section>
        <h2 class="mb-4 text-2xl font-bold">Top Content</h2>
        <div class="border-border overflow-hidden rounded border">
          <table class="w-full">
            <thead class="border-border bg-surface-alt border-b">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium">Page</th>
                <th class="px-4 py-3 text-right text-sm font-medium">Views</th>
                <th class="px-4 py-3 text-right text-sm font-medium">Avg. Time</th>
              </tr>
            </thead>
            <tbody>
              {data.topContent.map((item, i) => (
                <tr key={i} class="border-border border-b last:border-0">
                  <td class="px-4 py-3">
                    <div class="font-medium">{item.title}</div>
                    <div class="text-text-muted text-sm">{item.path}</div>
                  </td>
                  <td class="px-4 py-3 text-right">{item.views.toLocaleString()}</td>
                  <td class="text-text-muted px-4 py-3 text-right">{formatDuration(item.avgTimeOnPage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top projects */}
      <section>
        <h2 class="mb-4 text-2xl font-bold">Top Projects</h2>
        <div class="grid gap-3">
          {data.topProjects.map((project, i) => (
            <div key={i} class="border-border flex items-center justify-between rounded border p-4">
              <div>
                <div class="font-medium">{project.name}</div>
                <div class="text-text-muted text-sm">
                  {project.views.toLocaleString()} views · {project.clicks.toLocaleString()} clicks
                </div>
              </div>
              <div class="text-accent text-2xl font-bold">{((project.clicks / project.views) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </section>

      {/* Geography & Devices - side by side */}
      <div class="grid gap-8 lg:grid-cols-2">
        {/* Geography */}
        <section>
          <h2 class="mb-4 text-2xl font-bold">Geography</h2>
          <div class="space-y-3">
            {data.geography.map((geo, i) => (
              <div key={i} class="border-border rounded border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <span class="font-medium">{geo.country}</span>
                  <span class="text-text-muted">{geo.users.toLocaleString()} users</span>
                </div>
                <div class="bg-surface-alt h-2 overflow-hidden rounded">
                  <div class="bg-accent h-full" style={{ width: `${geo.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Devices */}
        <section>
          <h2 class="mb-4 text-2xl font-bold">Devices</h2>
          <div class="space-y-3">
            <DeviceBar label="Desktop" value={data.devices.desktop} />
            <DeviceBar label="Mobile" value={data.devices.mobile} />
            <DeviceBar label="Tablet" value={data.devices.tablet} />
          </div>
        </section>
      </div>

      {/* Referrers */}
      <section>
        <h2 class="mb-4 text-2xl font-bold">Top Referrers</h2>
        <div class="grid gap-2">
          {data.referrers.map((ref, i) => (
            <div key={i} class="border-border flex items-center justify-between rounded border p-3">
              <div>
                <span class="font-medium">{ref.source}</span>
                <span class="text-text-muted ml-2 text-sm">({ref.type})</span>
              </div>
              <span class="text-text-muted">{ref.users.toLocaleString()} users</span>
            </div>
          ))}
        </div>
      </section>

      {/* Engagement */}
      <section>
        <h2 class="mb-4 text-2xl font-bold">Engagement</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Avg. Scroll Depth" value={`${data.engagement.scrollDepth.avg.toFixed(0)}%`} />
          <MetricCard label="Avg. Reading Time" value={formatDuration(data.engagement.readingTime.avg)} />
          <MetricCard label="Audio Plays" value={data.engagement.audioPlays.toLocaleString()} />
          <MetricCard label="Gallery Views" value={data.engagement.galleryViews.toLocaleString()} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div class="border-border bg-surface-alt rounded border p-4">
      <div class="text-text-muted mb-1 text-sm">{label}</div>
      <div class="text-accent text-3xl font-bold">{value}</div>
    </div>
  );
}

function DeviceBar({ label, value }: { label: string; value: number }) {
  return (
    <div class="border-border rounded border p-3">
      <div class="mb-2 flex items-center justify-between">
        <span class="font-medium">{label}</span>
        <span class="text-text-muted">{value.toFixed(1)}%</span>
      </div>
      <div class="bg-surface-alt h-2 overflow-hidden rounded">
        <div class="bg-accent h-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}
