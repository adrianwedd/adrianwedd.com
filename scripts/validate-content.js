#!/usr/bin/env node
// Content validation — checks all content collection entries for common issues.
// Exit 1 on hard errors (missing required fields, description too long).
// Prints warnings for soft issues but exits 0.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src/content');
const PUBLIC_DIR = join(ROOT, 'public');

const COLLECTIONS = {
  blog: {
    required: ['title', 'description', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: true,
  },
  projects: {
    required: ['title', 'description', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: true,
  },
  audio: {
    required: ['title', 'description', 'date', 'tags', 'audioUrl'],
    checkAudioUrl: true,
    checkDescription: true,
  },
  gallery: {
    required: ['title', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: false,
  },
};

let errors = 0;
let warnings = 0;

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = value;
  }
  return fm;
}

for (const [collection, rules] of Object.entries(COLLECTIONS)) {
  const dir = join(CONTENT_DIR, collection);
  if (!existsSync(dir)) continue;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const filePath = join(dir, file);
    const content = readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const label = `${collection}/${file}`;

    // Required fields
    for (const field of rules.required) {
      if (!fm[field] || fm[field].trim() === '') {
        console.error(`ERROR [${label}]: missing required field '${field}'`);
        errors++;
      }
    }

    // Description length
    if (rules.checkDescription && fm.description && fm.description.length > 160) {
      console.error(
        `ERROR [${label}]: description is ${fm.description.length} chars (max 160): "${fm.description.slice(0, 60)}..."`
      );
      errors++;
    }

    // heroImage path existence (warn only)
    if (fm.heroImage && fm.heroImage.startsWith('/') && !fm.heroImage.startsWith('http')) {
      const imgPath = join(PUBLIC_DIR, fm.heroImage);
      if (!existsSync(imgPath)) {
        console.warn(`WARN [${label}]: heroImage not found in public/: ${fm.heroImage}`);
        warnings++;
      }
    }
  }
}

console.log(`\nValidation complete: ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0) process.exit(1);
