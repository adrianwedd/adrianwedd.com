import { describe, it, expect } from 'vitest';
import { assertSocialHealth, assertCsp, assertMtaSts } from '../../scripts/verify-worker.mjs';

describe('assertSocialHealth (liveness)', () => {
  it('passes on 200 + the unauth {"ok":true} body', () => {
    expect(assertSocialHealth(200, '{"ok":true}').ok).toBe(true);
  });
  it('fails on non-200', () => {
    expect(assertSocialHealth(503, '{"ok":true}').ok).toBe(false);
  });
  it('fails on non-JSON body', () => {
    expect(assertSocialHealth(200, '<html>error</html>').ok).toBe(false);
  });
});

describe('assertCsp', () => {
  const nonce = 'X0PqfxDjWOOHu7gxnySUAQ';
  it('passes when header nonce is real AND present in the body (worker rewrote HTML)', () => {
    const header = `script-src 'nonce-${nonce}' 'strict-dynamic'`;
    const body = `<html><script nonce="${nonce}">x()</script></html>`;
    expect(assertCsp(header, body).ok).toBe(true);
  });
  it('fails when there is no CSP header at all', () => {
    expect(assertCsp(null, '<html></html>').ok).toBe(false);
  });
  it('fails on a degenerate empty nonce literal', () => {
    expect(assertCsp("script-src 'nonce-' 'strict-dynamic'", '<html></html>').ok).toBe(false);
  });
  it('fails when the header has a nonce but the body was NOT rewritten', () => {
    const header = `script-src 'nonce-${nonce}' 'strict-dynamic'`;
    const body = '<html><script>x()</script></html>'; // no nonce in body
    expect(assertCsp(header, body).ok).toBe(false);
  });
});

describe('assertMtaSts', () => {
  it('passes on 200 + version: STSv1', () => {
    expect(assertMtaSts(200, 'version: STSv1\nmode: enforce\n').ok).toBe(true);
  });
  it('fails when the body lacks the version line', () => {
    expect(assertMtaSts(200, 'mode: enforce\n').ok).toBe(false);
  });
});
