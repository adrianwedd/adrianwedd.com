# Security Policy

## Scope

This repository contains:

- A static Astro site deployed to GitHub Pages
- A Cloudflare Worker (`worker/`) handling social media publishing
- A Cloudflare Worker (`worker-csp/`) injecting CSP nonces at the edge
- GitHub Actions workflows for CI/CD and content automation

All three surfaces are in scope for responsible disclosure.

## Reporting a vulnerability

Email **adrian@adrianwedd.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Whether you believe it is already being actively exploited

Please **do not** open a public GitHub issue for security vulnerabilities.

I will acknowledge your report within 72 hours and aim to provide a fix or
mitigation within 14 days for critical issues.

## Out of scope

- Theoretical vulnerabilities with no practical exploitability
- Issues requiring physical access to a device
- Social-engineering attacks against me or my infrastructure providers

## Please do not

- Test against the live production endpoints (`social.adrianwedd.com`,
  `adrianwedd.com`) without prior written permission — the social worker
  handles real Facebook/Instagram/Bluesky/X tokens and a test run could
  trigger real posts or exhaust idempotency records
- Attempt to access, exfiltrate, or modify data in Cloudflare KV, D1, or R2
- Attempt to bypass Cloudflare Access or Turnstile on production
