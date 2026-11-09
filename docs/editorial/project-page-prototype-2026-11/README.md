# Project page layout prototype, November 2026

Companion evidence for issue #784 and the writing-first layout PR. Two pages, desktop and mobile, before and after.

**Before** — captured from the deployed site before the change.
**After** — captured from a local build of the prototype at the same widths (1440×900 desktop, 390×844 mobile, 2× / 3× device pixel ratio).

## What changed

|                  | Before                                                                                                         | After                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Order            | breadcrumb → status pill, date, Visit/Source → title → card description → tags → audio → infographic → prose   | breadcrumb → **title → lede** → status/date/links → tags → audio → infographic → prose                            |
| Opening sentence | the ≤160-char card description ("A voice-agent failure eval harness plus a scripted healthcare receptionist…") | the page's own first sentence, in body type at 20px                                                               |
| Metadata         | led the page                                                                                                   | supports the lede; same fields, quieter                                                                           |
| Artefact         | infographic only                                                                                               | `dead-air` also shows a screenshot of its live operator board, captioned, inside the section that makes the claim |

The lede is optional (`lede:` in frontmatter). Pages without one fall back to the description, so nothing else on the site changes until it is deliberately rewritten.

## Files

| File                                         | Shows                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `dead-air-desktop-before.jpg` / `-after.jpg` | the full reorder, plus the board screenshot in the article                    |
| `dead-air-mobile-before.jpg` / `-after.jpg`  | the same at 390 px; the lede takes four lines and the metadata row still fits |
| `ordr-fm-desktop-before.jpg` / `-after.jpg`  | a page with no artefact: proves the layout does not depend on imagery         |

## What the comparison shows

- The page now starts with a sentence about the work rather than a filing record.
- On mobile the lede is four lines, then one metadata row, then tags — no crowding, no horizontal overflow.
- `ordr.fm` reads better without an image than it did with the infographic as its opening frame, because its first sentence ("My music library is the single most curated collection I own") does the work the poster was doing badly.
- `dead-air`'s board screenshot sits at the claim it supports, at 1200×630 with intrinsic dimensions, so it does not shift layout while loading.

Screenshots are deliberately unretouched, including the cookie banner and the site chrome.
