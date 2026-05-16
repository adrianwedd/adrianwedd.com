import { describe, it, expect } from 'vitest';
import { isAllowedMediaUrl, isSafeHttpsUrl } from '../platforms/safe-fetch';

describe('isAllowedMediaUrl', () => {
  it.each([
    'https://cdn.adrianwedd.com/notebook-assets/x/audio.mp3',
    'https://adrianwedd.com/og/blog/x.jpg',
    'https://img.youtube.com/vi/abc/maxresdefault.jpg',
  ])('allows %s', (url) => {
    expect(isAllowedMediaUrl(url)).toBe(true);
  });

  it.each([
    'http://cdn.adrianwedd.com/x.jpg',           // not https
    'https://attacker.example/x.jpg',            // not allowlisted
    'https://169.254.169.254/latest/meta-data',  // IP literal (cloud metadata)
    'https://10.0.0.1/x',                        // private IP literal
    'file:///etc/passwd',                         // non-http scheme
    'not-a-url',                                  // unparseable
  ])('rejects %s', (url) => {
    expect(isAllowedMediaUrl(url)).toBe(false);
  });

  it('rejects host-confusion with @ in URL', () => {
    // Test parser robustness — the host is example.com, not cdn.adrianwedd.com
    expect(isAllowedMediaUrl('https://cdn.adrianwedd.com@example.com/x.jpg')).toBe(false);
  });
});

describe('isSafeHttpsUrl', () => {
  it('accepts an arbitrary HTTPS hostname', () => {
    expect(isSafeHttpsUrl('https://pds.example.com/xrpc')).toBe(true);
  });

  it('rejects IP literals and non-https schemes', () => {
    expect(isSafeHttpsUrl('https://169.254.169.254')).toBe(false);
    expect(isSafeHttpsUrl('http://pds.example.com')).toBe(false);
    expect(isSafeHttpsUrl('ftp://pds.example.com')).toBe(false);
  });
});
