# Tomorrow's Task: Retry Failed Infographics

## What happened today (2026-02-14)

Successfully generated NotebookLM infographics for **13 of 32 projects**. The remaining 19 projects hit NotebookLM rate limits.

**Retry attempted:** All 19 failed again (still rate-limited or service degraded). Daily quota may not have reset yet.

## Projects that need infographics (19 total)

- home-assistant-obsidian
- latent-self
- lunar-tools-prototypes
- modelatlas
- neuroconnect
- notebooklm-automation
- orbitr
- ordr-fm
- personal-agentic-operating-system
- rlm-mcp
- space-weather
- squishmallowdex
- strategic-acquisitions
- tanda-pizza
- tel3sis
- this-wasnt-in-the-brochure
- ticketsmith
- veritas
- why-demonstrated-risk-is-ignored

## How to retry (tomorrow when quota resets)

```bash
cd /Users/adrian/repos/adrianwedd.com

# Run the retry script (auto-detects projects without infographics)
./scripts/retry-failed-infographics.sh --yes

# Or manually run the main script (skips projects with existing infographics)
./scripts/generate-all-infographics.sh --yes

# After completion, commit the results
git add public/notebook-assets/*/infographic.webp src/content/projects/*.md
git commit -m "Add remaining NotebookLM infographics for 19 projects"
git push
```

## Notes

- NotebookLM daily quota: ~50 infographic generations
- The retry script uses the same batch generation flow
- Projects already with infographics will be skipped automatically
- Expected time: ~40 minutes (19 projects × 2 min avg)
- If you hit rate limits again, wait a few hours and retry

## What was delivered today

✅ GA4 real analytics dashboard (build-time data fetch)
✅ 13 NotebookLM portrait infographics as hero images (~150KB WebP each)
✅ Batch generation scripts with retry capability

Delete this file after completing the retry.
