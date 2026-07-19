import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The `cloudflare:workers` module is provided by the Workers runtime in
// production builds (Wrangler resolves it). Vitest runs in plain Node, so
// alias it to a tiny shim that mirrors the API our code uses.
export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./test-shims/cloudflare-workers.ts', import.meta.url),
      ),
      'cloudflare:email': fileURLToPath(
        new URL('./test-shims/cloudflare-email.ts', import.meta.url),
      ),
    },
  },
});
