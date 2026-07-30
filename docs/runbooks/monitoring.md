# Monitoring runbook

What watches what, why each check exists, and what is still blind.

The organising idea: **liveness monitoring answers "did this URL return 200?"**
Everything in here exists because something can be broken while the answer is
still yes.

## Layers

| Layer | Where | Answers |
|---|---|---|
| Uptime | Upptime (`adrianwedd/upptime`), every 5 min | Is it serving? Do the authed health endpoints report degradation? |
| Health endpoints | `worker/src/index.ts` `/api/health`, book-api `/health`, ops `/api/health/xero`, twitb `/api/health?deep` | Are tokens valid, crons alive, queues draining? |
| Monitoring watchdog | `monitor-watchdog.yml` (hourly) + `worker/src/watchdog.ts` (Cloudflare cron) | Is the monitoring itself still running? |
| Expiry sweep | `expiry-sweep.yml` (weekly) | What runs out on a date? |
| Content integrity | `content-integrity.yml` (weekly + post-deploy) | Is the site up but not working? |
| Token expiry | `social-token-alert.yml` (weekly) | Are platform data-access windows closing? |

## The mutual watchdog, and its honest limit

Every check except one runs on GitHub Actions. That makes a silent Actions
failure invisible — no check runs, nothing turns red, and the status page still
looks green because Upptime generates it. Upptime cannot close this: its own
"Status Page" check lives inside Upptime.

So the two platforms watch each other:

- **Cloudflare → GitHub.** The social worker has a Cloudflare cron trigger
  (`wrangler.toml` `[triggers] crons = ["23 * * * *"]`). It emails when
  `monitor-watchdog.yml` stops checking in. This is the part that keeps working
  when GitHub Actions is what stopped.
- **GitHub → Cloudflare.** Upptime checks `/api/health` and (once re-added, see
  below) `/api/watchdog/status`, both of which 503 on degradation.

**The limit, stated plainly:** the worker is a shared dependency of the
Cloudflare→GitHub direction. If the worker is down, its cron doesn't fire, the
check-in fails, and no email goes out. What catches that is the GitHub side going
red, plus the fact that a dead worker also stops social publishing. Two platforms
is the most independence available here — it is not three.

## Design rules these checks follow

Break these and the monitoring gets worse, not better.

1. **A missing signal is a bad signal, not an unknown one.** A cron with no
   heartbeat, a repo whose workflows can't be read, a source that never checked
   in — all treated as degraded. Silently skipping is how a check passes while
   the thing it measures is broken.
2. **Only success writes proof of life.** A lock-skip writes no heartbeat (the
   lock holder writes its own); a 5xx writes none (the 5xx is already the alert);
   a crashed workflow step does not check in (`if: success()`, never `always()`).
3. **Never let an alert go permanently red.** Alert on the *un-notified* subset
   of crisis flags, not the raw count — nothing deletes a flag on acknowledgement
   and the TTL is 90 days. A check that is always red is a check that gets
   ignored.
4. **Model the system's real timing.** The stuck-queue threshold is grace + the
   drain time the backlog implies, because the cron only takes 12 posts per tick;
   a flat grace flagged any legitimate burst over 60 posts.
5. **One root cause, one alert.** The queue-stall reason is suppressed when a
   platform token is invalid — the cron skips blocked platforms, so the token is
   the whole reason and the actionable half.
6. **Cooldowns and clocks advance only on successful delivery.** Otherwise a
   failed send suppresses retries of an alert nobody received.
7. **Prefer auth-free checks.** The expiry and integrity sweeps use public DNS,
   public RDAP, TLS handshakes and public URLs. Losing expiry monitoring because
   a token expired would be a particularly stupid failure.

## Gotchas that have already bitten

- **GitHub Actions runs `run:` blocks as `bash -e {0}`.** Combined with
  `-o pipefail`, any failing pipeline aborts the script — and the failing
  pipelines are the ones detecting problems (`grep -o` exits 1 on no match). All
  three sweeps deliberately `set +e -u +o pipefail`. Do not "tidy" that.
- **Test workflow shell by extracting it from the YAML and running it under
  `bash -e`** in `docker run ubuntu:24.04`. Running `bash script.sh` locally does
  not reproduce production, and `date -u -d` is GNU-only so macOS proves nothing.
- **`grep -c` counts matching LINES.** The feeds are single-line XML, so 98 items
  counted as 1. Use `grep -o … | wc -l`.
- **rdap.org rate-limits bursts.** 29 back-to-back lookups produced three phantom
  "UNMONITORED" findings. Paced 2s with retries.
- **`.au` and `.ch` publish no RDAP expiry** (auDA policy; SWITCH serves none).
  Those registrations are only covered by a registrar-side reminder.
- **A GitHub run stuck `waiting` holds its concurrency group** and blocks every
  later run of that group. A 2026-07-21 worker-deploy run did this for five days.
- **GitHub silently disables scheduled workflows after 60 days of repo
  inactivity.**

## Deploy sequencing (matters)

The Cloudflare cron trigger is new, so a worker deploy is what activates it.

1. Merge the PR, then deploy the worker through the gated `worker-deploy.yml`.
2. **Seed the heartbeats**: dispatch `social-cron.yml` for both `publish` and
   `comments`. Until they run once, `/api/health` correctly reports stale and
   returns 503 — that is the design (a cron with no recorded run is exactly the
   outage being detected), not a bug.
3. Re-add the Upptime `Monitoring Watchdog` check on `/api/watchdog/status`
   (upptime commit `1774d659`, reverted in `81cc5a1a` because the endpoint 404s
   until the worker deploys).

## Still blind

Recorded so the next person doesn't assume it's covered.

- **Twitter API credit balance.** No public API. This has caused a real outage
  (credits hit zero, posts silently stopped). Only a calendar reminder helps.
- **Workers request counts and quota.** Needs Cloudflare GraphQL analytics; no
  available token is authorised for it (`/graphql` returns "not authorized for
  that account"). R2 storage *is* readable via
  `/accounts/{id}/r2/buckets/{name}/usage` if it ever becomes worth watching.
- **Cloudflare API token expiry.** `/user/tokens/verify` is not authorised for
  the tokens we hold, so a token can't self-report its own expiry.
- **`.au` / `.ch` domain registration expiry.** See above.
- **The booking write path.** `/slots` and `/health` are reads; the real July
  failure was `POST /book` 500ing while silently creating calendar events. A
  synthetic booking needs an authenticated bypass of the Turnstile gate
  (`book-api/src/index.js`, fails closed by design). That deliberately punches a
  hole in a control hardened on 2026-07-29, so it needs an explicit decision
  before building. Sketch if approved: bearer-authenticated `synthetic: true`
  flag, sentinel time slot, event deleted immediately, rate-limited, and the
  bypass rejected unless the bearer matches a dedicated secret.
- **Whether Adrian actually reads the alerts.** The weekly proof-of-life email
  makes silence a signal, but nothing verifies a human acted on a real one.
