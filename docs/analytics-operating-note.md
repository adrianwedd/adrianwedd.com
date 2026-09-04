# Analytics operating note

Last audited: 4 September 2026.

## What is running

The production site uses GA4 (`gtag.js`) from `src/components/Analytics.astro`, mounted once by `BaseLayout.astro`. It is asynchronous, sends manual page views for Astro View Transitions, and does not load until analytics consent is granted. AdSense and LinkedIn Insight are separate advertising-consent integrations; they are not part of the GA measurement journey. The public `/analytics/` page reads a build-time GA Data API export and does not collect traffic.

`cv.adrianwedd.com` is a separate static repository at `~/repos/cv`, using the same GA property. Its event implementation is in `assets/analytics-events.js`; its GA configuration is in `assets/analytics-config.js`.

The 90-day event comparison crosses two instrumentation changes. Commit `ddab90e` (17 June) removed View Transition listener stacking and duplicate-event risk. Commits `7c299b6` and `8b4a894` (19 July) repaired navigation classification and split analytics from advertising consent. Therefore the observed fall in events per user is not evidence of changed reader behaviour.

## Event taxonomy

Events carry `page_path`, `traffic_type`, and any session campaign values. Destination data is limited to hostname and pathname; query strings, link text, email addresses, form values, names, notes, and Turnstile data are never sent.

| Event                                                                                                                                        | Meaning                                                          | GA key event?                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `page_view`                                                                                                                                  | A consented page view, including content type                    | No                                          |
| `scroll_depth`                                                                                                                               | 25/50/75/100% depth, once per page                               | No                                          |
| `engaged_time`                                                                                                                               | At least 60 seconds visible on a supported content page          | No                                          |
| `article_engaged`                                                                                                                            | Blog/project reached both 75% depth and 60 seconds               | No                                          |
| `project_outbound_click`                                                                                                                     | External destination selected from a blog post/project           | No                                          |
| `audio_play`, `audio_progress`                                                                                                               | Media start and quartile progress                                | No                                          |
| `cv_view`                                                                                                                                    | Visitor leaves the main site for the canonical CV                | No; interest, not outcome                   |
| `cv_download`                                                                                                                                | Full or short CV PDF selected on the CV site                     | No                                          |
| `high_intent_transition`                                                                                                                     | Article/project or other relevant page moves to services/contact | No; journey denominator/numerator           |
| `cv_next_step`                                                                                                                               | CV moves to services or contact                                  | **Yes** — explicit onward commercial intent |
| `contact_intent`                                                                                                                             | Email or phone mechanism selected                                | **Yes** — explicit request to communicate   |
| `booking_intent`                                                                                                                             | Booking mechanism selected                                       | No; weaker than completion                  |
| `enquiry_submit`                                                                                                                             | Enquiry API confirmed success                                    | **Yes** — completed lead action             |
| `booking_complete`                                                                                                                           | Booking API confirmed success                                    | **Yes** — completed appointment             |
| `file_download`, `outbound_click`, `project_click`, `gallery_view`, `tag_filter`, `theme_switch`, `copy_text`, `page_timing`, `section_view` | Supporting behaviour or diagnostics                              | No                                          |

The four bold events are configured as key events in GA Admin. `contact_intent` is counted once per session; completed enquiry/booking events use once per event. Keeping browsing and reading events ordinary prevents attention from being reported as conversion.

## Attribution and traffic boundaries

Use lowercase values and this convention:

`?utm_source=<platform>&utm_medium=organic_social&utm_campaign=<durable-topic-or-release>&utm_content=<placement-or-creative>`

Example: `?utm_source=facebook&utm_medium=organic_social&utm_campaign=protest_rights&utm_content=launch_post`. Do not put names, email addresses, audience identifiers, or message copy in UTM fields. The first explicit UTM set is retained in session storage across View Transitions and is forwarded to the CV. A later explicitly tagged arrival replaces it; untagged internal navigation does not.

Every event has `traffic_type`. Normal production traffic is `unclassified`—not asserted to be human. Known traffic can be classified without geography:

- CI or automated browser receipts: build with `PUBLIC_ANALYTICS_TRAFFIC_TYPE=ci`, or use `?aw_traffic=ci`.
- Preview/manual QA: `PUBLIC_ANALYTICS_TRAFFIC_TYPE=preview` or `?aw_traffic=preview`.
- Uptime checks: configure the monitor URL with `?aw_traffic=monitor`.
- Adrian's own checks: use `?aw_traffic=internal` for that session.

The event-scoped GA custom dimension `Traffic type` is configured for `traffic_type`; exclude or compare these known classes in reports. Do not exclude Ashburn, Council Bluffs, or any city: location is only a clue, not sufficient evidence that a request is automated. GA's consented client-side collection already omits most non-JavaScript crawlers, but headless browsers and monitors can still appear.

## Verification and implementation locations

- Main collection, consent, campaign persistence, sanitisation and deduplication: `src/components/Analytics.astro`.
- Successful enquiry/booking signals: `src/pages/contact.astro`; these dispatch local events only after their APIs succeed.
- Canonical CV links and minimal path into the CV: `src/pages/services.astro`.
- Production-build browser receipts: `e2e/analytics-intent.spec.ts` and `e2e/consent.spec.ts`.
- CV next steps and sanitised events: `~/repos/cv/index.html`, `~/repos/cv/assets/analytics-events.js`, and `~/repos/cv/assets/analytics-config.js`.

Before deployment, run `PUBLIC_GA_MEASUREMENT_ID=G-TESTE2E0000 npm run test:e2e:smoke`, `npm run check`, and the CV repository tests. In browser QA, grant analytics-only consent, inspect `window.dataLayer`, follow a UTM-tagged landing through an internal page and into the CV, and confirm each intended event appears once. After deployment, use GA DebugView with a session classified `internal`; never submit a real enquiry or booking just to test analytics.

GA Admin now contains the `Traffic type` custom dimension and key-event definitions for `cv_next_step`, `contact_intent`, `enquiry_submit`, and `booking_complete`; historical events are unchanged. Additional event-scoped dimensions such as `from_content_type` and `destination_path` should be registered only if the 28-day review needs them, avoiding unnecessary high-cardinality definitions.

## 28-day review card

Review only after enough data exists to avoid narrating individual visits:

1. Users and sessions excluding known `traffic_type` classes; label the remainder “unclassified”, not “humans”.
2. Sessions by source/medium/campaign.
3. Engaged readership: unique content readers with `article_engaged`, by article.
4. Article/project → services/contact transition rate.
5. CV → services/contact transition rate and CV download count.
6. Key-event count and session key-event rate, split by acquisition source.
7. Returning-user share as a weak directional signal, not identity.

Limitations: consent denial and blockers create undercounting; GA cannot prove a visitor is human; tiny samples do not support causal claims; successful form events are available only after deployment; the CV currently has independent consent behaviour that should be reviewed separately before claiming one consistent privacy model across both hosts.
