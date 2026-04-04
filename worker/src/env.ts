export interface Env {
  // KV
  SOCIAL: KVNamespace;

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
}
