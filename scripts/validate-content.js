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

const COLLECTIONS = {
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

let errors = 0;
let warnings = 0;

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

for (const [collection, rules] of Object.entries(COLLECTIONS)) {
  const dir = join(CONTENT_DIR, collection);
  if (!existsSync(dir)) continue;

  for (const filePath of findMarkdownFiles(dir)) {
    const content = readFileSync(filePath, 'utf8');
    const { data: fm } = matter(content);
    const label = filePath.replace(CONTENT_DIR + '/', '');

    // Duplicate YAML keys — gray-matter silently deduplicates, so check raw text
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const keys = [...fmMatch[1].matchAll(/^([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1]);
      const seen = new Set();
      for (const key of keys) {
        if (seen.has(key)) {
          console.error(`ERROR [${label}]: duplicate frontmatter key '${key}'`);
          errors++;
        }
        seen.add(key);
      }
    }

    // Required fields
    for (const field of rules.required) {
      const val = fm[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        console.error(`ERROR [${label}]: missing required field '${field}'`);
        errors++;
      }
    }

    // Audio/video media URL — must have at least one of audioUrl or videoUrl
    if (rules.requireMediaUrl && !fm.audioUrl && !fm.videoUrl) {
      console.error(`ERROR [${label}]: missing required field 'audioUrl' or 'videoUrl'`);
      errors++;
    }

    // Description length
    if (rules.checkDescription && fm.description && fm.description.length > 160) {
      console.error(
        `ERROR [${label}]: description is ${fm.description.length} chars (max 160): "${fm.description.slice(0, 60)}..."`
      );
      errors++;
    }

    // heroImage path existence (warn only)
    if (fm.heroImage && typeof fm.heroImage === 'string' && fm.heroImage.startsWith('/') && !fm.heroImage.startsWith('http')) {
      const imgPath = join(PUBLIC_DIR, fm.heroImage);
      if (!existsSync(imgPath)) {
        console.warn(`WARN [${label}]: heroImage not found in public/: ${fm.heroImage}`);
        warnings++;
      }
    }

    // Gallery images validation
    if (rules.checkImages) {
      if (!fm.images || !Array.isArray(fm.images)) {
        console.error(`ERROR [${label}]: missing or invalid 'images' array`);
        errors++;
      } else if (fm.images.length === 0) {
        console.warn(`WARN [${label}]: images array is empty`);
        warnings++;
      } else {
        fm.images.forEach((img, i) => {
          if (!img.src) {
            console.error(`ERROR [${label}]: images[${i}] missing 'src'`);
            errors++;
          }
          if (!img.alt) {
            console.warn(`WARN [${label}]: images[${i}] missing 'alt'`);
            warnings++;
          }
        });
      }
    }
  }
}

console.log(`\nValidation complete: ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0) process.exit(1);
