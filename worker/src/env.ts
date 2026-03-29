export interface Env {
  // KV
  SOCIAL: KVNamespace;

  // Vars
  FACEBOOK_PAGE_ID: string;
  GRAPH_API_VERSION: string;

  // Secrets (set via wrangler secret put)
  CRON_SECRET: string;
  PUBLISH_SECRET: string;
  CLI_SECRET: string;
  FACEBOOK_PAGE_TOKEN: string;
  FACEBOOK_APP_TOKEN: string;
}
