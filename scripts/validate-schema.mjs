#!/usr/bin/env node
/**
 * Validate JSON-LD schema in built HTML files.
 * Runs against dist/ after build.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const DIST = 'dist';
let errors = 0;
let checked = 0;

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function extractSchemas(html) {
  const root = parse(html);
  return root
    .querySelectorAll('script[type="application/ld+json"]')
    .map((el) => {
      try {
        return JSON.parse(el.text);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function fail(file, msg) {
  console.error(`  ✗ ${file}: ${msg}`);
  errors++;
}

function isRedirect(html) {
  return html.includes('http-equiv="refresh"') || html.includes('http-equiv=refresh');
}

function hasType(schemas, type) {
  return schemas.some(
    (s) => s['@type'] === type || (Array.isArray(s['@type']) && s['@type'].includes(type))
  );
}

// Homepage
const homepageHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');
const homeSchemas = extractSchemas(homepageHtml);
if (!hasType(homeSchemas, 'WebSite')) {
  fail('index.html', 'Missing WebSite schema');
}
checked++;

// Blog posts
const blogDir = join(DIST, 'blog');
if (statSync(blogDir).isDirectory()) {
  for (const entry of readdirSync(blogDir)) {
    const indexPath = join(blogDir, entry, 'index.html');
    if (entry === 'tag' || entry === 'tags') continue;
    try {
      if (!statSync(indexPath).isFile()) continue;
    } catch {
      continue;
    }

    const html = readFileSync(indexPath, 'utf-8');
    if (isRedirect(html)) continue;
    const schemas = extractSchemas(html);

    if (!hasType(schemas, 'Article')) {
      fail(`blog/${entry}`, 'Missing Article schema');
    }

    const article = schemas.find((s) => s['@type'] === 'Article');
    if (article) {
      if (!article.headline) fail(`blog/${entry}`, 'Article missing headline');
      if (!article.datePublished) fail(`blog/${entry}`, 'Article missing datePublished');
      if (!article.author) fail(`blog/${entry}`, 'Article missing author');
    }

    checked++;
  }
}

// Project pages
const projectDir = join(DIST, 'projects');
if (statSync(projectDir).isDirectory()) {
  for (const entry of readdirSync(projectDir)) {
    const indexPath = join(projectDir, entry, 'index.html');
    if (entry === 'tag' || entry === 'tags') continue;
    try {
      if (!statSync(indexPath).isFile()) continue;
    } catch {
      continue;
    }

    const html = readFileSync(indexPath, 'utf-8');
    if (isRedirect(html)) continue;
    const schemas = extractSchemas(html);

    if (!hasType(schemas, 'SoftwareApplication') && !hasType(schemas, 'CreativeWork')) {
      fail(`projects/${entry}`, 'Missing SoftwareApplication or CreativeWork schema');
    }

    checked++;
  }
}

// Validate all schemas have @context and @type
const allHtml = walkDir(DIST);
for (const file of allHtml) {
  const html = readFileSync(file, 'utf-8');
  const schemas = extractSchemas(html);
  for (const schema of schemas) {
    if (!schema['@context']) {
      fail(file, `Schema missing @context: ${JSON.stringify(schema).slice(0, 80)}`);
    }
    if (!schema['@type']) {
      fail(file, `Schema missing @type: ${JSON.stringify(schema).slice(0, 80)}`);
    }
  }
}

console.log(`Schema validation: ${checked} pages checked, ${errors} error(s)`);
process.exit(errors > 0 ? 1 : 0);
