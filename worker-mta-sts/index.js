/**
 * MTA-STS policy host for adrianwedd.com
 * Serves the policy at https://mta-sts.adrianwedd.com/.well-known/mta-sts.txt
 *
 * Mode is "testing": receivers report TLS failures (via TLS-RPT) but do NOT
 * block mail. Once TLS-RPT reports confirm clean delivery, switch mode to
 * "enforce" below AND bump the `id` in the _mta-sts.adrianwedd.com TXT record
 * (e.g. the date) so receivers re-fetch the policy.
 *
 * MX list mirrors the live Google Workspace MX for adrianwedd.com exactly.
 */
const POLICY = `version: STSv1
mode: testing
mx: aspmx.l.google.com
mx: alt1.aspmx.l.google.com
mx: alt2.aspmx.l.google.com
mx: aspmx2.googlemail.com
mx: aspmx3.googlemail.com
max_age: 604800
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/.well-known/mta-sts.txt') {
      return new Response(POLICY, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};
