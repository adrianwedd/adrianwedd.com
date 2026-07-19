// Post-deploy edge verification. Pure assertion fns + a retrying probe runner.
// CLI: `node scripts/verify-worker.mjs <social|csp|mta-sts>` → exit 0 pass / 1 fail.

export function assertSocialHealth(status, body) {
  // Liveness/routing probe only — the unauthenticated response is {"ok":true}.
  if (status !== 200) return { ok: false, reason: `expected 200, got ${status}` };
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, reason: 'body is not valid JSON' };
  }
  if (typeof json !== 'object' || json === null) {
    return { ok: false, reason: 'JSON body is not an object' };
  }
  return { ok: true };
}

const CSP_NONCE_RE = /nonce-([A-Za-z0-9+/=]{20,})/;
export function assertCsp(headerValue, body) {
  if (!headerValue) return { ok: false, reason: 'no Content-Security-Policy response header' };
  const m = CSP_NONCE_RE.exec(headerValue);
  if (!m) return { ok: false, reason: 'CSP header lacks a real nonce-<base64> token' };
  const nonce = m[1];
  // The worker injects the SAME nonce into <script> tags. If the header carries
  // a nonce but the body doesn't, the worker set a header without rewriting the
  // HTML — a broken deploy that a header-only check would miss.
  if (!body || !body.includes(nonce)) {
    return { ok: false, reason: 'header nonce not found in HTML body (worker did not rewrite the page)' };
  }
  return { ok: true };
}

export function assertMtaSts(status, body) {
  if (status !== 200) return { ok: false, reason: `expected 200, got ${status}` };
  if (!/version:\s*STSv1/.test(body)) return { ok: false, reason: 'body missing "version: STSv1"' };
  return { ok: true };
}

const TARGETS = {
  social: {
    url: 'https://social.adrianwedd.com/api/health',
    check: async (res) => assertSocialHealth(res.status, await res.text()),
  },
  csp: {
    url: 'https://adrianwedd.com/',
    check: async (res) => assertCsp(res.headers.get('content-security-policy'), await res.text()),
  },
  'mta-sts': {
    url: 'https://mta-sts.adrianwedd.com/.well-known/mta-sts.txt',
    check: async (res) => assertMtaSts(res.status, await res.text()),
  },
};

export async function probe(key, { attempts = 5, delayMs = 10000 } = {}) {
  const t = TARGETS[key];
  if (!t) return { ok: false, reason: `unknown worker key: ${key}` };
  let last = { ok: false, reason: 'no attempts made' };
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(t.url, { redirect: 'manual' });
      last = await t.check(res);
    } catch (e) {
      last = { ok: false, reason: `fetch error: ${e.message}` };
    }
    if (last.ok) return last;
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

async function main() {
  const key = process.argv[2];
  const result = await probe(key);
  if (result.ok) {
    console.log(`verify ${key}: OK`);
    process.exit(0);
  }
  console.error(`verify ${key}: FAIL — ${result.reason}`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
