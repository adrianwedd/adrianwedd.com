#!/usr/bin/env node
/**
 * Triage state for auto-discovered paper candidates.
 *
 * The weekly content pipeline used to commit every discovery to a fresh
 * timestamped branch and then fail at `gh pr create`, so nothing was ever
 * reviewable, merged or expired: 15 orphaned branches accumulated between
 * 2026-02 and 2026-09 holding 78 sightings of 8 papers. The missing piece was
 * memory. Without a durable record of what has already been seen, every run
 * re-discovers the same papers and re-stamps them with a new date.
 *
 * This module is that memory. Candidate state is keyed by STABLE PAPER IDENTITY
 * (DOI, else OpenAlex ID, else canonical slug) — never by filename or date, so a
 * rejected paper cannot reappear next Sunday wearing a fresh date moustache.
 *
 * States:
 *   new               discovered, not yet judged
 *   triaged/harvested promoted into a real article by a human
 *   rejected          explicitly declined; must not resurface as "new"
 *   aged              seen repeatedly, still unjudged past the age threshold
 *
 * `aged` exists so an old candidate does not need a live Git branch to stay
 * remembered. Ageing is a manifest annotation, not a deletion.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const STATES = ['new', 'triaged', 'harvested', 'rejected', 'aged'];

export const DEFAULT_MANIFEST_PATH = 'data/auto-drafts-seen.json';

const EMPTY = {
  version: 1,
  note:
    'Durable triage memory for the content pipeline. Keyed by stable paper identity ' +
    '(DOI, else OpenAlex ID, else slug) so a rejected candidate cannot reappear as new. ' +
    'Never delete an entry to "expire" a candidate — set state to rejected/aged so the ' +
    'provenance survives.',
  candidates: {},
};

/** Strip a `10.` DOI of its URL wrapper and normalise case/whitespace. */
export function normaliseDoi(doi) {
  if (!doi) return null;
  let d = String(doi).trim().toLowerCase();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  d = d.replace(/^doi:\s*/i, '');
  d = d.replace(/[.,;)\]]+$/, '');
  return d.startsWith('10.') ? d : null;
}

export function normaliseOpenAlex(id) {
  if (!id) return null;
  const m = String(id)
    .toUpperCase()
    .match(/\b(W\d{6,})\b/);
  return m ? m[1] : null;
}

export function slugFromPath(p) {
  return path.basename(String(p)).replace(/\.md$/, '');
}

/**
 * Extract stable identity from a candidate's markdown.
 * Order: DOI -> OpenAlex ID -> canonical slug.
 * Returns { key, type, value }.
 */
export function identityOf(markdown, filePath = '') {
  const text = String(markdown ?? '');
  // DOI: bare doi.org link, or an explicit DOI: field.
  const doiMatch =
    text.match(/doi\.org\/(10\.[^\s)\]"'<>]+)/i) ||
    text.match(/\*\*DOI:\*\*\s*\[?\s*(10\.[^\s)\]"'<>]+)/i) ||
    text.match(/^doi:\s*(10\.\S+)/im);
  const doi = normaliseDoi(doiMatch && doiMatch[1]);
  if (doi) return { key: `doi:${doi}`, type: 'doi', value: doi };

  const oaMatch = text.match(/openalex\.org\/(W\d{6,})/i) || text.match(/\b(W\d{8,})\b/);
  const oa = normaliseOpenAlex(oaMatch && oaMatch[1]);
  if (oa) return { key: `openalex:${oa}`, type: 'openalex', value: oa };

  const slug = slugFromPath(filePath);
  return { key: `slug:${slug}`, type: 'slug', value: slug };
}

/** Frontmatter `date:` of a candidate — the generation date, not authorship. */
export function generatedDateOf(markdown) {
  const m = String(markdown ?? '').match(/^date:\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

export function contentHash(markdown) {
  return crypto
    .createHash('sha256')
    .update(String(markdown ?? ''), 'utf8')
    .digest('hex');
}

export function loadManifest(filePath) {
  if (!fs.existsSync(filePath)) return structuredClone(EMPTY);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { ...structuredClone(EMPTY), ...parsed, candidates: parsed.candidates ?? {} };
}

export function saveManifest(filePath, manifest) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  // Stable key order keeps weekly diffs readable.
  const ordered = {
    ...manifest,
    candidates: Object.fromEntries(
      Object.keys(manifest.candidates)
        .sort()
        .map((k) => [k, manifest.candidates[k]]),
    ),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(ordered, null, 2)}\n`);
}

/**
 * Decide what to do with one observed candidate.
 * Returns { action: 'new'|'duplicate'|'rejected'|'aged', key, ... }
 *
 * A candidate whose identity is already known is NEVER new, even if its
 * generated date has changed — that is the whole point of the identity key.
 */
export function classifyObservation(manifest, { markdown, filePath, seenOn, ageDays = 30 }) {
  const ident = identityOf(markdown, filePath);
  const hash = contentHash(markdown);
  const genDate = generatedDateOf(markdown);
  const today = seenOn || new Date().toISOString().slice(0, 10);
  const prior = manifest.candidates[ident.key];

  if (!prior) {
    return { action: 'new', key: ident.key, identity: ident, hash, genDate, seenOn: today };
  }

  const sightings = (prior.sightings ?? 0) + 1;
  const earliest = [prior.first_seen, genDate].filter(Boolean).sort()[0] ?? null;
  const last = [prior.last_seen, today].sort().at(-1);

  if (prior.state === 'rejected') {
    return {
      action: 'rejected',
      key: ident.key,
      identity: ident,
      hash,
      genDate,
      sightings,
      earliest,
      last,
      seenOn: today,
    };
  }

  // Repeatedly-unjudged candidates become 'aged' in the manifest rather than
  // accumulating a live branch each. Ageing never deletes provenance.
  let state = prior.state ?? 'new';
  if (state === 'new' && prior.first_seen) {
    const firstMs = Date.parse(prior.first_seen);
    if (Number.isFinite(firstMs) && (Date.parse(today) - firstMs) / 86400000 > ageDays) {
      state = 'aged';
    }
  }

  return {
    action: 'duplicate',
    key: ident.key,
    identity: ident,
    hash,
    genDate,
    seenOn: today,
    sightings,
    earliest,
    last,
    state,
    // Distinguish the two benign drift kinds so the manifest stays honest.
    dateOnlyDrift: prior.content_hash !== hash && prior.hash_without_date === hashWithoutDate(markdown),
    contentChanged: prior.content_hash !== hash && prior.hash_without_date !== hashWithoutDate(markdown),
  };
}

/** Hash with the generated date and live citation count removed. */
export function hashWithoutDate(markdown) {
  const stripped = String(markdown ?? '')
    .replace(/^date:.*$/m, 'date: <GENERATED>')
    .replace(/(\*\*Citations:\*\*\s*)\d+/g, '$1<N>')
    .replace(/^last_seen:.*$/m, '');
  return contentHash(stripped);
}

export function recordObservation(manifest, obs) {
  const prev = manifest.candidates[obs.key];
  const today = obs.seenOn || new Date().toISOString().slice(0, 10);
  const genDate = obs.genDate ?? null;

  // first_seen / last_seen are OBSERVATION dates (wall clock) — when the pipeline
  // actually saw the candidate. The generated frontmatter date is tracked
  // separately and never promoted to authorship, and never mixed into these, so
  // a restamped date can neither advance first_seen nor masquerade as new work.
  const firstSeen = [prev?.first_seen, today].filter(Boolean).sort()[0];
  const lastSeen = [prev?.last_seen, today].filter(Boolean).sort().at(-1);
  const earliestGen = [prev?.earliest_generation_date, genDate].filter(Boolean).sort()[0] ?? null;

  const entry = {
    identity: obs.identity.value,
    identity_type: obs.identity.type,
    slug: obs.identity.type === 'slug' ? obs.identity.value : (prev?.slug ?? null),
    first_seen: firstSeen,
    last_seen: lastSeen,
    earliest_generation_date: earliestGen,
    sightings: prev?.sightings ? prev.sightings + 1 : 1,
    state: obs.state ?? prev?.state ?? 'new',
    content_hash: obs.hash ?? prev?.content_hash ?? null,
    hash_without_date: hashWithoutDate(obs.markdown ?? ''),
    source: prev?.source ?? 'content-pipeline',
  };
  manifest.candidates[obs.key] = entry;
  return entry;
}
