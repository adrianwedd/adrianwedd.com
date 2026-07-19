// Workers rate-limiting binding ([[unsafe.bindings]] type "ratelimit" in
// wrangler.toml). Optional: absent in tests and any environment without the
// binding configured, in which case the middleware fails open (auth remains
// the primary control).
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  // KV
  SOCIAL: KVNamespace;

  // Durable Objects
  CRON_LOCK: DurableObjectNamespace;

  // Rate limiting
  API_RATE_LIMITER?: RateLimiter;

  // Email ([[send_email]] binding; optional — crisis alerts degrade to
  // /api/health surfacing when absent)
  CRISIS_EMAIL?: import('./email').EmailSender;

  // Crisis alert addresses (vars). TO must be a verified Email Routing
  // destination address on the zone.
  CRISIS_ALERT_FROM?: string;
  CRISIS_ALERT_TO?: string;

  // Vars
  FACEBOOK_PAGE_ID: string;
  GRAPH_API_VERSION: string;
  INSTAGRAM_BUSINESS_ACCOUNT_ID: string;
  BLUESKY_HANDLE: string;

  // Secrets (set via wrangler secret put)
  CRON_SECRET: string;
  PUBLISH_SECRET: string;
  CLI_SECRET: string;
  FACEBOOK_PAGE_TOKEN: string;
  FACEBOOK_APP_TOKEN: string;
  INSTAGRAM_ACCESS_TOKEN: string;
  BLUESKY_APP_PASSWORD: string;
  X_API_KEY: string;
  X_API_KEY_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_TOKEN_SECRET: string;
}
