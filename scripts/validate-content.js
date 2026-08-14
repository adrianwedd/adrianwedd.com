#!/usr/bin/env node
// Content validation — checks all content collection entries for common issues.
// Exit 1 on hard errors (missing required fields, description too long).
// Prints warnings for soft issues but exits 0.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src/content');
const PUBLIC_DIR = join(ROOT, 'public');

export const COLLECTIONS = {
  blog: {
    required: ['title', 'description', 'date', 'tags'],
    checkDescription: true,
  },
  projects: {
    required: ['title', 'description', 'date', 'tags'],
    checkDescription: true,
  },
  audio: {
    required: ['title', 'description', 'date', 'tags'],
    requireMediaUrl: true,
    checkDescription: true,
  },
  gallery: {
    required: ['title', 'date', 'tags'],
    checkDescription: false,
    checkImages: true,
  },
  fixes: {
    required: ['title', 'description', 'date', 'tags', 'category'],
    checkDescription: true,
  },
  'case-studies': {
    required: ['title', 'description', 'date', 'tags', 'category'],
    checkDescription: true,
  },
};

export const MAX_DESCRIPTION_LENGTH = 160;

const exactNumber = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const compactNumber = (value) => (value < 1000 ? exactNumber(value) : `${Math.round(value / 1000)}k`);
const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasMetric = (text, value, label) =>
  new RegExp(`\\b${escaped(value)}\\s+${label}\\b`, 'i').test(text.replace(/\s+/g, ' '));

/**
 * Guard the one current-figures Markdown surface that cannot import JSON.
 * The checks are semantic pairs (value + label), not exact sentences.
 */
export function validateFailureFirstProject(rawContent, stats) {
  const parsed = matter(rawContent);
  const description = String(parsed.data.description ?? '');
  const body = parsed.content;
  const errors = [];
  const descriptionMetrics = [
    ['models', exactNumber(stats.models), 'models?'],
    ['prompts', compactNumber(stats.prompts), 'prompts?'],
    ['techniques', exactNumber(stats.techniques), '(?:attack\\s+)?techniques?'],
    ['gradedResults', compactNumber(stats.gradedResults), '(?:FLIP[- ]?)?graded\\s+results?'],
  ];
  const bodyMetrics = [
    ['models', exactNumber(stats.models), 'models?'],
    ['prompts', exactNumber(stats.prompts), '(?:adversarial\\s+)?prompts?'],
    ['techniques', exactNumber(stats.techniques), 'techniques?'],
    ['benchmarkRuns', exactNumber(stats.benchmarkRuns), 'benchmark\\s+runs?'],
    ['gradedResults', exactNumber(stats.gradedResults), '(?:FLIP[- ]?)?graded\\s+results?'],
  ];

  for (const [field, value, label] of descriptionMetrics) {
    const hasCanonical = hasMetric(description, value, label);
    if (!hasCanonical) {
      errors.push(`description is missing canonical ${field} value ${value}`);
      continue;
    }
    const occurrences = description.matchAll(new RegExp(`\\b(\\d[\\d,]*(?:k)?)\\s+${label}\\b`, 'gi'));
    for (const occurrence of occurrences) {
      const found = occurrence[1];
      if (found.toLowerCase() !== value.toLowerCase()) {
        errors.push(`description contains non-canonical ${field} value ${found} (expected ${value})`);
      }
    }
  }
  for (const [field, value, label] of bodyMetrics) {
    const hasCanonical = hasMetric(body, value, label);
    if (!hasCanonical) {
      errors.push(`body is missing canonical ${field} value ${value}`);
      continue;
    }
    const occurrences = body.matchAll(new RegExp(`\\b(\\d[\\d,]*)\\s+${label}\\b`, 'gi'));
    for (const occurrence of occurrences) {
      const found = occurrence[1];
      if (Number(found.replaceAll(',', '')) !== stats[field]) {
        errors.push(`body contains non-canonical ${field} value ${found} (expected ${value})`);
      }
    }
  }
  return errors;
}

/** Compare fields established by the upstream Failure-First manifest. */
export function compareFailureFirstStats(local, upstream) {
  const mappings = [
    ['models', 'models_evaluated'],
    ['prompts', 'prompts'],
    ['techniques', 'techniques'],
    ['gradedResults', 'results'],
  ];
  const errors = [];
  if (local.upstreamCommit !== upstream.commit) {
    errors.push(
      `upstreamCommit differs: local ${local.upstreamCommit}, upstream ${upstream.commit} (${upstream.commit})`,
    );
  }
  if (upstream.artifact && local.upstreamArtifact !== upstream.artifact) {
    errors.push(
      `upstreamArtifact differs: local ${local.upstreamArtifact}, consulted ${upstream.artifact} (${upstream.commit})`,
    );
  }
  const evidenceDate = upstream.committedAt.slice(0, 10);
  if (local.asOf !== evidenceDate) {
    errors.push(`asOf differs: local ${local.asOf}, upstream evidence date ${evidenceDate} (${upstream.commit})`);
  }
  for (const [localField, upstreamField] of mappings) {
    if (local[localField] !== upstream.totals[upstreamField]) {
      errors.push(
        `${localField} differs: local ${local[localField]}, upstream ${upstream.totals[upstreamField]} (${upstream.commit})`,
      );
    }
  }
  if (upstream.statsTotals) {
    if (local.benchmarkRunsCommit !== upstream.statsCommit) {
      errors.push(
        `benchmarkRunsCommit differs: local ${local.benchmarkRunsCommit}, upstream ${upstream.statsCommit} (${upstream.statsCommit})`,
      );
    }
    if (upstream.statsArtifact && local.benchmarkRunsArtifact !== upstream.statsArtifact) {
      errors.push(
        `benchmarkRunsArtifact differs: local ${local.benchmarkRunsArtifact}, consulted ${upstream.statsArtifact} (${upstream.statsCommit})`,
      );
    }
    const statsMappings = [
      ['models', 'models'],
      ['prompts', 'prompts'],
      ['techniques', 'techniques'],
      ['benchmarkRuns', 'runs'],
      ['gradedResults', 'results'],
    ];
    for (const [localField, upstreamField] of statsMappings) {
      if (local[localField] !== upstream.statsTotals[upstreamField]) {
        errors.push(
          `${localField} differs: local ${local[localField]}, upstream ${upstream.statsTotals[upstreamField]} (${upstream.statsCommit})`,
        );
      }
    }
  }
  return errors;
}

/**
 * Validate a single content entry's raw markdown (frontmatter + body) against
 * a collection's rules. Pure — does no I/O and returns collected messages
 * rather than printing, so it can be unit-tested and reused by the CLI below.
 *
 * @param {string} rawContent  Full file contents (with `---` frontmatter block).
 * @param {object} rules       One collection's entry from COLLECTIONS.
 * @param {object} [options]
 * @param {(publicPath: string) => boolean} [options.imageExists]  Predicate for
 *   the soft heroImage-existence check. Omit to skip that check entirely.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateEntry(rawContent, rules, options = {}) {
  const { imageExists } = options;
  const errors = [];
  const warnings = [];

  // Duplicate YAML keys — must run BEFORE matter(), because the YAML parser
  // throws on duplicate mapping keys. Scanning the raw text first lets us emit
  // a clean error instead of crashing on the parser's exception.
  // NOTE: this scan is top-level only — keys nested under objects (e.g. inside
  // notebookAssets) are matched at column 0 only, so nested duplicates are not
  // detected here (the YAML parser still rejects them).
  const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const keys = [...fmMatch[1].matchAll(/^([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1]);
    const seen = new Set();
    for (const key of keys) {
      if (seen.has(key)) errors.push(`duplicate frontmatter key '${key}'`);
      seen.add(key);
    }
  }

  let fm;
  try {
    fm = matter(rawContent).data;
  } catch (err) {
    // Malformed YAML (including duplicate keys already reported above). Surface
    // a clean error rather than letting the exception crash the whole run.
    errors.push(`invalid frontmatter: ${String(err.message).split('\n')[0]}`);
    return { errors, warnings };
  }

  // Required fields.
  for (const field of rules.required) {
    const val = fm[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push(`missing required field '${field}'`);
    }
  }

  // Audio/video media URL — must have at least one of audioUrl or videoUrl.
  if (rules.requireMediaUrl && !fm.audioUrl && !fm.videoUrl) {
    errors.push(`missing required field 'audioUrl' or 'videoUrl'`);
  }

  // Description length.
  if (rules.checkDescription && fm.description && fm.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `description is ${fm.description.length} chars (max ${MAX_DESCRIPTION_LENGTH}): "${fm.description.slice(0, 60)}..."`,
    );
  }

  // heroImage path existence (warn only) — skipped unless an imageExists
  // predicate is supplied (the CLI supplies one backed by the filesystem).
  if (
    imageExists &&
    fm.heroImage &&
    typeof fm.heroImage === 'string' &&
    fm.heroImage.startsWith('/') &&
    !fm.heroImage.startsWith('http')
  ) {
    if (!imageExists(fm.heroImage)) {
      warnings.push(`heroImage not found in public/: ${fm.heroImage}`);
    }
  }

  // Gallery images validation.
  if (rules.checkImages) {
    if (!fm.images || !Array.isArray(fm.images)) {
      errors.push(`missing or invalid 'images' array`);
    } else if (fm.images.length === 0) {
      warnings.push(`images array is empty`);
    } else {
      fm.images.forEach((img, i) => {
        if (!img.src) errors.push(`images[${i}] missing 'src'`);
        if (!img.alt) warnings.push(`images[${i}] missing 'alt'`);
        // Same existence check as heroImage (warn only, local paths).
        if (
          imageExists &&
          img.src &&
          typeof img.src === 'string' &&
          img.src.startsWith('/') &&
          !img.src.startsWith('http') &&
          !imageExists(img.src)
        ) {
          warnings.push(`images[${i}] not found in public/: ${img.src}`);
        }
      });
    }
  }

  return { errors, warnings };
}

/** Recursively find all .md/.mdx files in a directory. */
function findMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  let errors = 0;
  let warnings = 0;
  const imageExists = (publicPath) => existsSync(join(PUBLIC_DIR, publicPath));
  const failureFirstStats = JSON.parse(readFileSync(join(ROOT, 'src/data/failure-first-stats.json'), 'utf8'));

  for (const [collection, rules] of Object.entries(COLLECTIONS)) {
    const dir = join(CONTENT_DIR, collection);
    if (!existsSync(dir)) continue;

    for (const filePath of findMarkdownFiles(dir)) {
      const content = readFileSync(filePath, 'utf8');
      const label = filePath.replace(CONTENT_DIR + '/', '');
      const result = validateEntry(content, rules, { imageExists });

      if (label === 'projects/failure-first.md') {
        result.errors.push(...validateFailureFirstProject(content, failureFirstStats));
      }

      for (const msg of result.errors) {
        console.error(`ERROR [${label}]: ${msg}`);
        errors++;
      }
      for (const msg of result.warnings) {
        console.warn(`WARN [${label}]: ${msg}`);
        warnings++;
      }
    }
  }

  console.log(`\nValidation complete: ${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) process.exit(1);
}

// Only run the CLI when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
