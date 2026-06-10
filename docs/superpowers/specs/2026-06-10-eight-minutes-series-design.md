# Eight Minutes — blog series design

**Date:** 2026-06-10
**Status:** Approved (design); publication gated on incident closure
**Source incident:** `~/incidents/2026-06-10-google-aitm-phishing` (not in this repo; never committed here)

## What this is

A three-part blog series on adrianwedd.com telling the human story of the
2026-06-10 real-time phishing attack: a vishing call, a lure email genuinely
signed by Google's own Support Cases auto-responder, one approved device
prompt, eight authenticated minutes, a Binance account-takeover pivot, and the
fight back — forensics, seven abuse reports, and the passkey ending.

failurefirst.ai owns the technical failure-analysis writeup. adrianwedd.com
owns the lived experience. The posts cross-link to the failurefirst piece once
it is live.

`writeup-public.md` in the incident folder is the seed text (~80% of the
narrative beats exist there) but the series names names and splits into three
emotional registers.

## The three parts

| # | Title | Slug | Register | Arc |
|---|-------|------|----------|-----|
| 1 | The Trap | `eight-minutes-the-trap` | dread | The 14:04 AEST vishing call (+1 650-918-0851), the case number, the named "support agent", the lure email that really was DKIM-signed and delivered by Google because the attacker seeded it through the Support Cases auto-responder from lookalike `google-management[.]com`. Why every authenticity check came back green. Ends on the tap — approving device prompt number 86. |
| 2 | The Fall | `eight-minutes-the-fall` | vertigo → relief | Inside the eight minutes: the operator relaying credentials live through `view-support[.]com`, attacker `login_success` at 04:21:34 UTC from 103.120.6.237, the immediate pivot to Binance via inbox password reset at 04:28, Google's risk engine blocking all four persistence attempts, Binance's 24-hour withdrawal freeze, the 04:36 password reset that killed the attacker session. Includes the one-sentence nuance: this was operator-relayed credential + push-prompt phishing, not cookie-theft AiTM — no session was stolen; one was granted. |
| 3 | The Fight | `eight-minutes-the-fight` | agency | Capturing the HAR while the attack was live, pulling Google Workspace audit logs to verify the reconstruction server-side, passive infrastructure mapping (no packets to attacker hosts), seven abuse reports in impact order, the takedown outcomes (written once known — this is why publication gates on closure), passkey enrollment as the ending. Carries the reader CTA and a `faq` frontmatter block mapping the "what you change today" list to FAQ schema. |

Frontmatter: `series: "Eight Minutes"`, `seriesOrder: 1..3`, shared tags
(`security`, `phishing`, `incident-response`, plus per-part), `draft: true`
until the publication gate clears.

## Disclosure rules

**Named:** Google, Binance. First-party experience, all facts evidenced by
first-party logs (Workspace audit + Binance's own emails).

**Published, defanged:** `view-support[.]com`, `google-management[.]com`,
origin IP 23.94.133.36, attacker IP 103.120.6.237, vishing number
+1 650-918-0851. Rationale: victims search these; publishing them is a
service. Defang so the post never links to hostile infrastructure.

**Never published:** Adrian's home IP/IPv6, the Web3 wallet address, the
Binance UID, mailbox contents beyond short lure quotes, evidence filenames,
the audit-pull tooling and `.secrets/`, the Drive wallet-file details,
anything from the 1Password triage.

## Asset kit

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| Lyria tracks | 3 | `../failure-first-embodied-ai` | One per register: dread (Part 1), vertigo (Part 2), agency (Part 3). Each becomes an audio-collection entry with `relatedPost`, served from R2. |
| Infographic heroes | 3 | NLM, canonical branded `--focus` prompt | `.webp` **plus `.jpg` twin** (CI gate; broke main twice without it). |
| Video trailer | 1 | NLM, `video_format: "cinematic"` + full style prompt (palette + NO-figures clause + motifs + beat structure) | Series-wide; embedded via `notebookAssets.videoUrl` from R2. |
| Audio overview | 1 | NLM | On Part 3, covering the whole series. |

**NLM source rule:** feed NLM the finished post markdowns only
(`textfile:src/content/blog/eight-minutes-*.md`). Never the incident evidence
— it contains personal IPs, account identifiers, and live IOCs.

## Publication gate

Posts stay `draft: true` until **full incident closure**:

- [ ] All seven abuse reports dispatched (1, 2, 4 sent 2026-06-10; 3, 5, 6 pending; 7 optional)
- [ ] Takedown outcomes recorded (these become Part 3 content)
- [ ] Passkeys / hardware keys enrolled on Google accounts
- [ ] Gmail forwarding / filters / POP-IMAP / delegates eyeballed (audit-log blind spot)
- [ ] Binance support transcript + login history preserved
- [ ] Backup codes regenerated; adrianwedd@gmail.com reviewed
- [ ] Investigation SA key + domain-wide delegation torn down; rclone remote removed
- [ ] 1Password rotation worklist done

At publish time: set `date` on three consecutive days (one per day),
`autopublish: true` so the date-triggered social drip handles distribution.
Do **not** hand-post and also set autopublish (re-broadcast trap).

## Out of scope

- The failurefirst.ai writeup (separate property, separate voice)
- Any change to incident-folder documents
- Republishing `writeup-public.md` verbatim anywhere
