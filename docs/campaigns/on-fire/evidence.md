# ON FIRE — validation and launch hold

25 October 2026. [Issue #746](https://github.com/adrianwedd/adrianwedd.com/issues/746) · [PR #747](https://github.com/adrianwedd/adrianwedd.com/pull/747).

Validated implementation: [`61f53d252f37d4316b67219a040ce5b658d29930`](https://github.com/adrianwedd/adrianwedd.com/commit/61f53d252f37d4316b67219a040ce5b658d29930). The later evidence commit adds these receipts/screenshots without changing application code. Production has not been changed. The PR must remain unmerged until Adrian explicitly approves launch; pushing to `main` runs the Pages deployment.

## Executed checks

| Command / check | Observed result |
| --- | --- |
| `npm run build` | Production Astro build and Pagefind completed. Final build restored to open offer. |
| `python3 -m unittest discover -s scripts/on-fire -p 'test_*.py' -v` | 8 passed: invalid/unauthorised intake, duplicate domain/business key, ordering, lifetime capacity, concurrent tenth award, withdrawals, corrupt state, retention purge. |
| `npm run test:unit` | 217 tests passed in 14 files on current remote-main base. |
| `npm run typecheck` | 0 errors, 0 warnings; 253 hints including existing ignored Playwright report assets. |
| `npm run lint` | Passed. |
| `npm run format:check` | Passed. |
| `node scripts/validate-content.js` | 0 errors and warnings. |
| `E2E_BASE_URL=http://localhost:4322 npx playwright test e2e/on-fire.spec.ts --project=chromium --project=mobile-chromium` | Open build: 6 passed, 2 closed-only checks skipped. Closed build: all 8 passed. |
| `node scripts/on-fire/render-check.mjs` | Dark/light at 390×844, 768×1024 and 1440×1000: no horizontal overflow. Primary CTA bottom at 536px on mobile, within initial viewport. Consent compact/expanded and motion-enabled mobile also captured. |
| `npm run check:links` | 96,174 internal links across 828 pages; 0 broken. |
| `npm run check:og` | All 826 image references resolve. 69 existing portrait-card warnings remain outside this campaign (#553). |
| `bash scripts/test-site.sh` | PASS, 0 errors, 1 existing local-media-reference warning. The earlier run against a still-building artifact failed on absent sitemap; the completed artifact passes. |
| `node scripts/check-hero-images.mjs` | 131 responsive heroes verified; compiled assets 71.3 MiB, under 100 MB gate. |
| `npx -y npm@11 audit --audit-level=high --omit=dev` | 0 vulnerabilities. No campaign dependency changes. Existing remote main supplies the dependency fixes. Full development audit remains in verification.json; do not confuse this production-gate pass with a clean whole-repository security audit. |
| Primary source fetches | PHP archive advisory anchors `2026-10-21-5` and `2026-10-23-1` verified in actual HTML. Both LiteLLM incident/investigation URLs opened successfully; canonical later account used. |

Browser checks cover keyboard clipboard success and denied-permission fallback announcements, no-JavaScript content and email access, honest draft wording, minimal fields/authority in the draft, no form submission, free/paid separation, local-to-campaign View Transition, and no observed analytics/ops requests before consent. The closed build checks application removal, preserved provider advice, `/local/` closure wording and replacement title, description, OG and Twitter images. No email or intrusive assessment was sent/run by these tests.

The assessment method and report remain manually operated. There is no public campaign form endpoint, server-side web-form validator or new per-IP web rate limiter to claim tested. Existing mailbox spam controls plus manual eligibility/authority checks govern intake, and the private ledger validates admitted records again. Malformed enquiries cannot award places. No caller-controlled content is rendered into automated email; all communication is reviewed and sent personally.

## Render evidence

- [Mobile dark hero](evidence/mobile-dark-hero.png), [mobile light hero](evidence/mobile-light-hero.png).
- [Tablet dark hero](evidence/tablet-dark-hero.png), [desktop dark hero](evidence/desktop-dark-hero.png), [desktop light hero](evidence/desktop-light-hero.png).
- [Mobile consent](evidence/mobile-consent.png), [expanded consent](evidence/mobile-consent-expanded.png), [motion enabled](evidence/mobile-motion-enabled.png).
- Full-page images for each size/theme are beside these captures; [closed desktop page](evidence/desktop-closed.png).
- [Measured layout observations](evidence/render-check.json), [structured validation record](evidence/verification.json).

Visual inspection included mobile full page/hero, tablet hero, desktop light hero, expanded mobile consent and the composed social card. The implementation uses existing site conventions, including its shared motion/reduced-motion behaviour; no campaign animation, font, framework or additional JavaScript bundle was introduced. The public campaign HTML is 70,304 bytes / 18,151 bytes gzip with the shared layout. Social cards are about 51 KB each and aren't loaded as hero images.

## Operator handoff and limits

Applications use the existing Google-hosted `adrian@adrianwedd.com` mailbox. The link opens an editable draft with business, website, location, contact, optional concern and authority confirmation. Clicking does not submit, acknowledge receipt or award a place. The application text/address also work without JavaScript. A read-only mailbox query confirmed recent receipt to the published address on 25 October; Google MX records were observed. **No campaign-specific receipt/reply test has been sent** because real enquiries are prohibited without authorisation. This remains a launch gate, not a claimed end-to-end email pass.

The canonical award ledger lives outside git at `~/.local/share/on-fire-campaign/ledger.json`. The default directory is private; records use mode 0600. One canonical host only. The lock covers read/order/count/write, duplicate awards are idempotent, all lifetime awards count towards ten, and the tool never requests a website or sends mail. Eligibility and business identity are human decisions. All earlier mailbox enquiries must be reviewed before awards; the tool cannot order messages it has not received. A static page cannot close itself on an administrative award: after the tenth, the ledger immediately refuses further awards, then publish `closed: true` from the shared state file promptly. Incoming mail while that release is pending must receive an honest full-offer reply.

[Operator guide](operator-guide.md) gives the ten operational steps, passive assessment scope, explicit intrusive-testing boundary, serious-compromise escalation, privacy/retention procedure and acknowledgement/award/decline/delivery templates. [Report template](report-template.md) is for a short plain-English report the owner can forward. Private copies of both were installed under `~/.local/share/on-fire-campaign/` with mode 0600. Filled reports/evidence belong there, never in this public repository. [Community announcements and source comment](launch-drafts.md) are prepared and unpublished.

Incremental recurring cost: **A$0 in new services**. Existing static hosting, email and protected device backups remain. No new database, CRM, cloud job, marketing integration or AI processing. No customer information was collected or sent during preparation. Existing unrelated media/artwork remains untouched; three unpublished Undertow commits remain preserved on local `main` and are excluded from this PR.

## Exact launch actions

1. Adrian explicitly authorises one marked test message from a separate mailbox. Check receipt, reply and spam handling; don't count it as an application. Do not launch if delivery is unreliable.
2. Recheck the current primary advisories, record the actual review/publication date in the page, and confirm the private ledger/retention reminder are owned by Adrian. Current copy honestly says prepared, with publication pending.
3. Confirm required PR checks at the final head; obtain Adrian's explicit campaign launch approval. **Merging PR #747 is the production release action.** Do not enable auto-merge or dispatch a deployment in advance.
4. After the approved merge, verify the Pages deployment completed and read back live `/on-fire/`, `/local/`, privacy, canonical, social metadata and email draft. Only then use the prepared community drafts, after checking each group's rules. No posts have been authorised or sent.
5. At the tenth lifetime award, publish the shared closed state, check the page and social metadata and refresh platform caches where available. Advice stays available. Delete identifying campaign records/correspondence after closure plus 90 days under the documented retention process; retain only anonymous award tombstones.
