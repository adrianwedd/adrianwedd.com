#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { compareFailureFirstStats } from './validate-content.js';

const REPOSITORY = 'adrianwedd/failure-first';
const ARTIFACT = 'MANIFEST.json';
const STATS_ARTIFACT = 'site/src/data/stats.ts';
const LOCAL_PATH = new URL('../src/data/failure-first-stats.json', import.meta.url);
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'adrianwedd.com-failure-first-integrity-check',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchUpstream() {
  const [commits, statsCommits] = await Promise.all(
    [ARTIFACT, STATS_ARTIFACT].map((path) =>
      fetchJson(`https://api.github.com/repos/${REPOSITORY}/commits?path=${encodeURIComponent(path)}&per_page=1`),
    ),
  );
  if (!Array.isArray(commits) || commits.length !== 1) throw new Error(`upstream returned no ${ARTIFACT} commit`);
  if (!Array.isArray(statsCommits) || statsCommits.length !== 1) {
    throw new Error(`upstream returned no ${STATS_ARTIFACT} commit`);
  }

  const commit = commits[0].sha;
  const committedAt = commits[0].commit.committer.date;
  const statsCommit = statsCommits[0].sha;
  const [manifest, statsSource] = await Promise.all([
    fetchJson(`https://raw.githubusercontent.com/${REPOSITORY}/${commit}/${ARTIFACT}`),
    fetch(`https://raw.githubusercontent.com/${REPOSITORY}/${statsCommit}/${STATS_ARTIFACT}`, { headers }).then(
      async (response) => {
        if (!response.ok) throw new Error(`${STATS_ARTIFACT} returned HTTP ${response.status}`);
        return response.text();
      },
    ),
  ]);
  const readStat = (field) => {
    const match = statsSource.match(new RegExp(`^\\s*${field}:\\s*([\\d_]+),`, 'm'));
    if (!match) throw new Error(`upstream ${STATS_ARTIFACT} has no numeric ${field} field`);
    return Number(match[1].replaceAll('_', ''));
  };
  return {
    commit,
    committedAt,
    artifact: `${REPOSITORY}:${ARTIFACT}`,
    totals: manifest.totals,
    statsCommit,
    statsArtifact: `${REPOSITORY}:${STATS_ARTIFACT}`,
    statsTotals: Object.fromEntries(
      ['models', 'prompts', 'techniques', 'runs', 'results'].map((key) => [key, readStat(key)]),
    ),
  };
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

async function main() {
  const local = JSON.parse(await readFile(LOCAL_PATH, 'utf8'));
  const upstream = await fetchUpstream();
  const revision = `${ARTIFACT}@${upstream.commit} (${upstream.committedAt}); ${STATS_ARTIFACT}@${upstream.statsCommit}`;

  if (process.argv.includes('--sync')) {
    await writeFile(LOCAL_PATH, `${JSON.stringify(syncedStats(upstream), null, 2)}\n`);
    console.log(`Synced Failure-First stats from ${revision}`);
    return;
  }

  const errors = compareFailureFirstStats(local, upstream);
  if (errors.length > 0) {
    console.error(`Failure-First stats differ from upstream revision ${revision}:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Failure-First stats match upstream revision ${revision}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
