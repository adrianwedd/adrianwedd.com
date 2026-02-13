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
    fetch('/api/analytics')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div class="text-center py-12 text-text-muted">
        Loading analytics data...
      </div>
    );
  }

  if (error) {
    return (
      <div class="border border-border bg-surface-alt rounded p-6 text-center">
        <p class="text-text-muted mb-2">Failed to load analytics data</p>
        <p class="text-sm text-text-muted">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div class="space-y-8">
      {/* Period indicator */}
      <div class="text-sm text-text-muted">
        Data from {new Date(data.period.start).toLocaleDateString()} to{' '}
        {new Date(data.period.end).toLocaleDateString()}
      </div>

      {/* Overview metrics */}
      <section>
        <h2 class="text-2xl font-bold mb-4">Overview</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Pageviews"
            value={data.overview.totalPageviews.toLocaleString()}
          />
          <MetricCard
            label="Unique Visitors"
            value={data.overview.totalUsers.toLocaleString()}
          />
          <MetricCard
            label="Avg. Session Duration"
            value={formatDuration(data.overview.avgSessionDuration)}
          />
          <MetricCard
            label="Bounce Rate"
            value={`${data.overview.bounceRate.toFixed(1)}%`}
          />
        </div>
      </section>

      {/* Top content */}
      <section>
        <h2 class="text-2xl font-bold mb-4">Top Content</h2>
        <div class="border border-border rounded overflow-hidden">
          <table class="w-full">
            <thead class="bg-surface-alt border-b border-border">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium">Page</th>
                <th class="px-4 py-3 text-right text-sm font-medium">Views</th>
                <th class="px-4 py-3 text-right text-sm font-medium">Avg. Time</th>
              </tr>
            </thead>
            <tbody>
              {data.topContent.map((item, i) => (
                <tr key={i} class="border-b border-border last:border-0">
                  <td class="px-4 py-3">
                    <div class="font-medium">{item.title}</div>
                    <div class="text-sm text-text-muted">{item.path}</div>
                  </td>
                  <td class="px-4 py-3 text-right">{item.views.toLocaleString()}</td>
                  <td class="px-4 py-3 text-right text-text-muted">
                    {formatDuration(item.avgTimeOnPage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top projects */}
      <section>
        <h2 class="text-2xl font-bold mb-4">Top Projects</h2>
        <div class="grid gap-3">
          {data.topProjects.map((project, i) => (
            <div key={i} class="border border-border rounded p-4 flex items-center justify-between">
              <div>
                <div class="font-medium">{project.name}</div>
                <div class="text-sm text-text-muted">
                  {project.views.toLocaleString()} views · {project.clicks.toLocaleString()} clicks
                </div>
              </div>
              <div class="text-2xl font-bold text-accent">
                {((project.clicks / project.views) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Geography & Devices - side by side */}
      <div class="grid lg:grid-cols-2 gap-8">
        {/* Geography */}
        <section>
          <h2 class="text-2xl font-bold mb-4">Geography</h2>
          <div class="space-y-3">
            {data.geography.map((geo, i) => (
              <div key={i} class="border border-border rounded p-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">{geo.country}</span>
                  <span class="text-text-muted">{geo.users.toLocaleString()} users</span>
                </div>
                <div class="h-2 bg-surface-alt rounded overflow-hidden">
                  <div
                    class="h-full bg-accent"
                    style={{ width: `${geo.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Devices */}
        <section>
          <h2 class="text-2xl font-bold mb-4">Devices</h2>
          <div class="space-y-3">
            <DeviceBar label="Desktop" value={data.devices.desktop} />
            <DeviceBar label="Mobile" value={data.devices.mobile} />
            <DeviceBar label="Tablet" value={data.devices.tablet} />
          </div>
        </section>
      </div>

      {/* Referrers */}
      <section>
        <h2 class="text-2xl font-bold mb-4">Top Referrers</h2>
        <div class="grid gap-2">
          {data.referrers.map((ref, i) => (
            <div key={i} class="border border-border rounded p-3 flex items-center justify-between">
              <div>
                <span class="font-medium">{ref.source}</span>
                <span class="text-sm text-text-muted ml-2">({ref.type})</span>
              </div>
              <span class="text-text-muted">{ref.users.toLocaleString()} users</span>
            </div>
          ))}
        </div>
      </section>

      {/* Engagement */}
      <section>
        <h2 class="text-2xl font-bold mb-4">Engagement</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Avg. Scroll Depth"
            value={`${data.engagement.scrollDepth.avg.toFixed(0)}%`}
          />
          <MetricCard
            label="Avg. Reading Time"
            value={formatDuration(data.engagement.readingTime.avg)}
          />
          <MetricCard
            label="Audio Plays"
            value={data.engagement.audioPlays.toLocaleString()}
          />
          <MetricCard
            label="Gallery Views"
            value={data.engagement.galleryViews.toLocaleString()}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div class="border border-border rounded p-4 bg-surface-alt">
      <div class="text-sm text-text-muted mb-1">{label}</div>
      <div class="text-3xl font-bold text-accent">{value}</div>
    </div>
  );
}

function DeviceBar({ label, value }: { label: string; value: number }) {
  return (
    <div class="border border-border rounded p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium">{label}</span>
        <span class="text-text-muted">{value.toFixed(1)}%</span>
      </div>
      <div class="h-2 bg-surface-alt rounded overflow-hidden">
        <div class="h-full bg-accent" style={{ width: `${value}%` }} />
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
