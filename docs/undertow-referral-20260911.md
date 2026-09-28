# Undertow referral acquisition repair

The real 2026-09-11 Undertow → Contact journey reached Adrian's page with
`utm_source=undertow&utm_medium=referral&utm_campaign=undertow_station` and no
`_gl` linker. Adrian's existing `G-ET0FJJS7C7` tag received the values only as
custom `ep.utm_*`, while its privacy-preserving `page_location` omitted the query.
Those custom names are not standard GA acquisition fields.

The event wrapper now maps the five existing bounded UTM fields into Google's
standard `campaign_source`, `campaign_medium`, `campaign_name`,
`campaign_content`, and `campaign_term`. The query-free location, custom UTM
fields, existing property ID and consent handling are preserved. Empty attribution
adds no campaign override; arbitrary keys and non-string values are not mapped.

Validation: three unit checks; Astro check (0 errors, 0 warnings, 13 existing
hints); production build. An isolated Chromium test with the actual Google tag
confirmed `cs=undertow`, `cm=referral`, `cn=undertow_station` with a query-free
location. All four test collector requests were aborted; this is serialization
proof, not production reporting proof. Production receipt follows delivery in
Undertow's docs/ga4-property-migration-20260911.md and issue 30.

Reference: [Google campaign configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
