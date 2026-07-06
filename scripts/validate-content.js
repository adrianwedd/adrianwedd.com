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
  const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
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

  for (const [collection, rules] of Object.entries(COLLECTIONS)) {
    const dir = join(CONTENT_DIR, collection);
    if (!existsSync(dir)) continue;

    for (const filePath of findMarkdownFiles(dir)) {
      const content = readFileSync(filePath, 'utf8');
      const label = filePath.replace(CONTENT_DIR + '/', '');
      const result = validateEntry(content, rules, { imageExists });

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
