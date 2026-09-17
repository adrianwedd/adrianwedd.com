# Auto-draft backlog archive (2026)

Preservation receipt for the content-pipeline auto-draft backlog.

## What this is

Between 2026-02-15 and 2026-09-13 the weekly `content-pipeline.yml` run discovered
research papers, committed 200-word stubs to a fresh timestamped branch, and then
failed at the `gh pr create` step:

```
pull request create failed: GraphQL: GitHub Actions is not permitted
to create or approve pull requests (createPullRequest)
```

The branches were never reviewable, never merged, and never expired. Fifteen
accumulated (`content/auto-drafts-*`), holding 78 sightings of **8 distinct papers**.
Because the pipeline has no cross-run dedupe, the same paper was re-stamped weekly with
a new frontmatter `date:` — that field is the only substantive difference between
sightings.

This commit preserves the distinct set once, with provenance, so those fifteen
branches can be deleted without destroying their only record.

## What this is not

Not authored content and **not a proposal to publish**. Every preserved stub is
machine-generated from a paper abstract and is `draft: true`. Harvesting a candidate
into a real article is a separate, human-owned decision — copy the file out, rewrite
it, and publish it on its own branch. Do not merge this directory into the published
site as-is.

## Layout

- `manifest.json` — machine-readable provenance (identity, sightings, commits, hashes)
- `candidates/*.md` — one canonical copy per distinct paper

## Identity and canonical-copy policy

- Identity is the DOI where present, else the OpenAlex ID, else the canonical slug.
- The canonical copy is the **earliest observed generation date**. Later restamped
  dates are recorded as sightings, never promoted — a fresh `date:` moustache is not
  new authorship.
- Citation counts in the body refresh from the upstream API between sightings; this is
  also drift, not new work.
- Anything that ever differed by more than generated date or citation count would have
  been preserved as a separate copy and flagged. Nothing did.
