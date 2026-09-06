# Analytics production receipt — 2026-09-04

## Release chain

- `adrianwedd.com` analytics implementation: PR [#652](https://github.com/adrianwedd/adrianwedd.com/pull/652), merge `0a02015fb950240ff2637d60d498893dd82d281b` (rebased implementation commit `97286f30d7eb6f0fdaa7ac3fe74bb259d7f3cf29`).
- Query-safe page locations: PR [#654](https://github.com/adrianwedd/adrianwedd.com/pull/654), merge `12d77138da3160ceee0f66e4e95e242878a8db8a` (implementation commit `ac87d3c92fc27d037eb351c34098b67ac20cd1b1`).
- CV analytics implementation: PR [cv#398](https://github.com/adrianwedd/cv/pull/398), merge/deployment commit `83eb4cd94a8ce34b3a4cd30475350a5d06e3753c` (implementation commit `2767dbb1fffa934bf10905835ea1cbf5efb0523f`).
- Independent prerequisite security fix: Dependabot PR [#650](https://github.com/adrianwedd/adrianwedd.com/pull/650), merge `bee8f3575806aaab6af09460d0631ed9a4c07540`. This upgraded `fast-uri` to resolve the advisory that blocked #652. It is not part of the analytics implementation.

## Deployment status

- Main site: GitHub Pages workflow [33824300489](https://github.com/adrianwedd/adrianwedd.com/actions/runs/33824300489), successful for `12d77138da3160ceee0f66e4e95e242878a8db8a`. The first attempt encountered an npm quick-audit HTTP 400; the unchanged failed-job rerun passed all build, worker audit, link, site-test, artifact, and deployment gates.
- CV: GitHub Pages reported `built` for `83eb4cd94a8ce34b3a4cd30475350a5d06e3753c` at `2026-09-04T00:08:51Z`.
- Production URLs exercised: <https://adrianwedd.com/>, an article, `/services/`, `/contact/`, and <https://cv.adrianwedd.com/>.

## Production verification

A controlled browser journey used `utm_source=release_qa`, `utm_medium=internal`, `utm_campaign=analytics_ship`, and `aw_traffic=internal`. Collector requests demonstrated:

- one query-safe `page_view` per actual page, including Astro View Transition destinations;
- `traffic_type=internal` and the three campaign fields on main-site custom events;
- UTM and internal classification decoration from the main site to the CV and back;
- a real `article_engaged` event after 63 seconds and 100% measured depth (the 60-second/75% production threshold was not weakened);
- one `project_outbound_click`, one article-to-services `high_intent_transition`, one `cv_next_step`, and one `contact_intent`;
- `page_location` values containing origin and path only, no arbitrary query string;
- no test secret, email address, mailto target, form value, or arbitrary query value in emitted event parameters;
- successful navigation with GA unavailable in the normal Chrome profile, where the tag was blocked;
- GA collector acceptance during the diagnostic journey.

An initial production check found that GA Enhanced Measurement independently emitted a second page view for browser-history changes. With Adrian's explicit approval, only **Page changes based on browser history events** was disabled for stream `5135731320`; page-load measurement and all other Enhanced Measurement options were left unchanged. A post-change wire receipt showed exactly one attributed page view for the article and one for the View Transition to `/services/`, with no sensitive referrer leakage.

GA Admin showed these intended key events as starred:

- `contact_intent`
- `cv_next_step`
- `enquiry_submit`
- `booking_complete`

Ordinary engagement events, including `page_view`, `scroll_depth`, `outbound_click`, and `page_timing`, remained unstarred.

### DebugView limitation

The controlled journey sent `debug_mode=true` and a subsequent diagnostic sent GA's native `_dbg=1` marker on 16 GA collector requests. GA Admin DebugView nevertheless reported zero debug devices during the observation window. The internal-traffic filter was confirmed as **Testing**, not Active, and the wire-level requests were accepted. This is recorded as a GA DebugView/reporting limitation rather than claimed as visible DebugView evidence. Production event semantics were verified at the collector boundary; GA's Recent events surface may require normal processing time before the newly introduced names appear.

## Deliberately not exercised

- `enquiry_submit` was not produced because that requires a real successful enquiry.
- `booking_complete` was not produced because that requires a real booking.
- Their browser tests and success-only dispatch paths remain the verification boundary for this release.

## Rollback state

- Main analytics rollback: revert merges `12d77138da3160ceee0f66e4e95e242878a8db8a` and `0a02015fb950240ff2637d60d498893dd82d281b` through protected pull requests. Do **not** revert independent security prerequisite `bee8f3575806aaab6af09460d0631ed9a4c07540` as part of an analytics rollback.
- CV analytics rollback: revert `83eb4cd94a8ce34b3a4cd30475350a5d06e3753c` through the CV repository's protected release path.
- The GA history-change setting should be re-enabled only if manual View Transition pageviews are also removed or replaced; otherwise duplicate pageviews and unsafe automatic referrers return.

## Measurement correction — 2026-09-06

Two pre-existing measurement defects were corrected together on 2026-09-06. Header navigation to the Projects index no longer emits `project_click`; only links to an individual `/projects/{slug}/` page qualify. This creates an intentional discontinuity in that event series: before this date, visits to the index through the header inflated the metric with `project_name: "Projects"`. Persisted BFCache restores now emit exactly one manual, query-free `page_view`, closing the corresponding undercount without changing ordinary-load or Astro View Transition measurement.

## Separate consent decision

The CV's independent consent behavior was not changed. The policy and architecture decision remains tracked in [cv#397](https://github.com/adrianwedd/cv/issues/397).
