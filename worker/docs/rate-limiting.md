# Rate limiting `social.adrianwedd.com/api/*`

Tracked in [#473](https://github.com/adrianwedd/adrianwedd.com/issues/473). The social
worker's endpoints are bearer-authed (timing-safe `PUBLISH_SECRET` / `CLI_SECRET`) but
have **no abuse protection** — a leaked or brute-forced token, or simple volumetric
abuse against the auth check itself, is unmitigated. This adds a Cloudflare Rate
Limiting rule at the edge, _in front of_ the worker, so abusive traffic is dropped
before it ever runs worker code or touches KV.

This is **defense-in-depth**, not the primary control (auth is). It must be applied in
the Cloudflare dashboard / via Terraform — it is not worker code.

## Endpoints covered

All under `social.adrianwedd.com/api/`:

| Method | Path                            | Legit caller                              | Cadence              |
| ------ | ------------------------------- | ----------------------------------------- | -------------------- |
| POST   | `/api/publish`                  | `social-autopublish.yml` (GitHub Actions) | per new content file |
| POST   | `/api/queue`, `/api/queue/sync` | manual / seed sync                        | rare                 |
| POST   | `/api/cron/publish`             | `social-cron.yml`                         | hourly               |
| POST   | `/api/cron/comments`            | `social-cron.yml`                         | every 2h             |
| GET    | `/api/health`                   | monitoring                                | occasional           |

Legitimate traffic is **low-volume and bursty from GitHub-hosted runner IPs** (which
rotate). A per-IP+path budget of ~30/min is generous for every real caller while
stopping abuse cold.

## Recommended rule

- **Match:** `(http.host eq "social.adrianwedd.com" and starts_with(http.request.uri.path, "/api/"))`
- **Counting characteristics:** client IP (`ip.src`) **+** URI path (`http.request.uri.path`) — i.e. each IP gets an independent budget per endpoint ("IP+path" per #473)
- **Threshold:** 30 requests per **60s**
- **Action:** **Block** (not Managed Challenge — these are programmatic clients with no browser to solve a challenge; a challenge would break the autopublish/cron workflows)
- **Mitigation timeout:** 60s
- **Response:** 429 with a short JSON body

> Free plans include one Rate Limiting rule per zone — this is it. If you later need
> per-endpoint thresholds (e.g. a tighter cap on `/api/publish` than `/api/health`),
> that requires additional rules (paid) or moving the logic into the worker.

### Dashboard steps

1. Cloudflare dashboard → zone **adrianwedd.com** → **Security** → **WAF** → **Rate limiting rules** → **Create rule**.
2. **Name:** `social-api-ratelimit`.
3. **If incoming requests match** → use the **Edit expression** (Expression Preview) box and paste:
   ```
   (http.host eq "social.adrianwedd.com" and starts_with(http.request.uri.path, "/api/"))
   ```
4. **With the same characteristics** → add **IP** and **URI Path**.
5. **When rate exceeds** → **30** requests per **1 minute**.
6. **Then take action** → **Block**, **Duration: 1 minute**.
7. (Optional) **Response type** → Custom JSON: `{"error":"rate_limited"}`, status `429`.
8. **Deploy**.

### Terraform equivalent

If you prefer IaC (`cloudflare` provider ≥ 4.x), this rule is a `http_ratelimit`-phase
ruleset on the zone:

```hcl
resource "cloudflare_ruleset" "social_api_ratelimit" {
  zone_id = var.adrianwedd_zone_id
  name    = "social-api-ratelimit"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    ref         = "social_api_ratelimit"
    description = "Throttle social worker API to 30 req/min per IP+path"
    expression  = "(http.host eq \"social.adrianwedd.com\" and starts_with(http.request.uri.path, \"/api/\"))"
    action      = "block"

    action_parameters {
      response {
        status_code  = 429
        content      = "{\"error\":\"rate_limited\"}"
        content_type = "application/json"
      }
    }

    ratelimit {
      characteristics     = ["ip.src", "http.request.uri.path"]
      period              = 60
      requests_per_period = 30
      mitigation_timeout  = 60
    }
  }
}
```

## Verifying after apply

```bash
# 35 rapid GETs to /api/health from one IP — expect some 429s after ~30.
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" https://social.adrianwedd.com/api/health
done | sort | uniq -c
```

A healthy result shows ~30×`200`/`401` then `429`s. Confirm the hourly `social-cron.yml`
run still succeeds the next cycle (it's well under 30/min).

---

## Appendix — optional HSTS belt-and-suspenders

PR for [#473](https://github.com/adrianwedd/adrianwedd.com/issues/473) adds
`Strict-Transport-Security: max-age=63072000; includeSubDomains` (no `preload`) on **HTML**
responses from the CSP worker. That sets the host-wide policy on any normal page load.
The only gap is a user whose _first-ever_ hit is a deep-linked asset (no HTML seen yet).

To close that, enable Cloudflare's edge HSTS, which applies to **all** responses:

- Dashboard → **SSL/TLS** → **Edge Certificates** → **HTTP Strict Transport Security (HSTS)** → **Enable**.
- Max-Age: **12 months**; **Apply HSTS to subdomains: On**; **Preload: Off** (matches the worker; flip on only when you're certain every subdomain is permanently HTTPS); **No-Sniff header: On**.

The worker header and the edge setting are complementary — identical directives, so no conflict.
