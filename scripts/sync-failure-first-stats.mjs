#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { compareFailureFirstStats } from './validate-content.js';

const REPOSITORY = 'adrianwedd/failure-first';
const ARTIFACT = 'MANIFEST.json';
const STATS_ARTIFACT = 'site/src/data/stats.ts';
const LOCAL_PATH = new URL('../src/data/failure-first-stats.json', import.meta.url);
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'adrianwedd.com-failure-first-integrity-check',
  'X-GitHub-Api-Version': '2022-11-28',
  // Unauthenticated api.github.com is 60 req/hr per IP — shared CI runners burn
  // that. Raw fetches don't need it; the commit-metadata calls do.
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

/** Newest commit touching an upstream path. Used by --sync, never by --check. */
async function latestCommit(path) {
  const commits = await fetchJson(
    `https://api.github.com/repos/${REPOSITORY}/commits?path=${encodeURIComponent(path)}&per_page=1`,
  );
  if (!Array.isArray(commits) || commits.length !== 1) throw new Error(`upstream returned no ${path} commit`);
  return commits[0].sha;
}

function readStat(statsSource, field) {
  const match = statsSource.match(new RegExp(`^\\s*${field}:\\s*([\\d_]+),`, 'm'));
  if (!match) throw new Error(`upstream ${STATS_ARTIFACT} has no numeric ${field} field`);
  return Number(match[1].replaceAll('_', ''));
}

/**
 * Read both upstream artifacts at explicit commits. Pinning is the point: the
 * published snapshot cites specific revisions, so the integrity check has to
 * consult those revisions. Resolving HEAD instead would make an unrelated
 * upstream push fail this repo's PR gate, and would compare two artifacts that
 * are only guaranteed coherent at the pinned pair.
 */
export async function fetchUpstreamAt({ commit, statsCommit }) {
  if (!commit) throw new Error('no upstream MANIFEST.json commit pinned');
  if (!statsCommit) throw new Error(`no upstream ${STATS_ARTIFACT} commit pinned`);

  const [manifestCommit, manifest, statsSource] = await Promise.all([
    fetchJson(`https://api.github.com/repos/${REPOSITORY}/commits/${commit}`),
    fetchJson(`https://raw.githubusercontent.com/${REPOSITORY}/${commit}/${ARTIFACT}`),
    fetchText(`https://raw.githubusercontent.com/${REPOSITORY}/${statsCommit}/${STATS_ARTIFACT}`),
  ]);

  return {
    commit,
    committedAt: manifestCommit.commit.committer.date,
    artifact: `${REPOSITORY}:${ARTIFACT}`,
    totals: manifest.totals,
    statsCommit,
    statsArtifact: `${REPOSITORY}:${STATS_ARTIFACT}`,
    statsTotals: Object.fromEntries(
      ['models', 'prompts', 'techniques', 'runs', 'results'].map((key) => [key, readStat(statsSource, key)]),
    ),
  };
}

export async function fetchUpstreamHead() {
  const [commit, statsCommit] = await Promise.all([latestCommit(ARTIFACT), latestCommit(STATS_ARTIFACT)]);
  return fetchUpstreamAt({ commit, statsCommit });
}

export function syncedStats(upstream) {
  return {
    asOf: upstream.committedAt.slice(0, 10),
    upstreamCommit: upstream.commit,
    upstreamArtifact: upstream.artifact,
    benchmarkRunsCommit: upstream.statsCommit,
    benchmarkRunsArtifact: upstream.statsArtifact,
    models: upstream.totals.models_evaluated,
    prompts: upstream.totals.prompts,
    techniques: upstream.totals.techniques,
    benchmarkRuns: upstream.statsTotals.runs,
    gradedResults: upstream.totals.results,
  };
}

function revisionLabel(upstream) {
  return `${ARTIFACT}@${upstream.commit} (${upstream.committedAt}); ${STATS_ARTIFACT}@${upstream.statsCommit}`;
}

/** Non-fatal: report that upstream has moved past the pinned snapshot. */
async function reportStaleness(local) {
  try {
    const [commit, statsCommit] = await Promise.all([latestCommit(ARTIFACT), latestCommit(STATS_ARTIFACT)]);
    const moved = [];
    if (commit !== local.upstreamCommit) moved.push(`${ARTIFACT} → ${commit}`);
    if (statsCommit !== local.benchmarkRunsCommit) moved.push(`${STATS_ARTIFACT} → ${statsCommit}`);
    if (moved.length > 0) {
      console.log(`Note: upstream has advanced since this snapshot (${moved.join('; ')}).`);
      console.log('Run `npm run sync:failure-first-stats` to republish against the newer evidence.');
    }
  } catch (error) {
    console.log(`Note: could not check whether upstream has advanced (${error.message}).`);
  }
}

async function sync() {
  const upstream = await fetchUpstreamHead();
  const next = syncedStats(upstream);
  // The two artifacts are published independently and can disagree mid-flight.
  // Writing a snapshot mixed from divergent revisions would publish figures no
  // single upstream revision supports — and would fail --check immediately.
  const errors = compareFailureFirstStats(next, upstream);
  if (errors.length > 0) {
    console.error(`Upstream artifacts disagree at ${revisionLabel(upstream)} — refusing to write a mixed snapshot.`);
    console.error('("local" below is the candidate snapshot built from MANIFEST.json.)');
    for (const error of errors) console.error(`- ${error}`);
    console.error('Wait for upstream to republish MANIFEST.json and site/src/data/stats.ts from the same corpus.');
    process.exitCode = 1;
    return;
  }
  await writeFile(LOCAL_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Synced Failure-First stats from ${revisionLabel(upstream)}`);
}

async function check(local) {
  const upstream = await fetchUpstreamAt({ commit: local.upstreamCommit, statsCommit: local.benchmarkRunsCommit });
  const errors = compareFailureFirstStats(local, upstream);
  if (errors.length > 0) {
    console.error(`Failure-First stats differ from pinned upstream revision ${revisionLabel(upstream)}:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Failure-First stats match pinned upstream revision ${revisionLabel(upstream)}`);
  await reportStaleness(local);
}

async function main() {
  if (process.argv.includes('--sync')) {
    await sync();
    return;
  }
  await check(JSON.parse(await readFile(LOCAL_PATH, 'utf8')));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
