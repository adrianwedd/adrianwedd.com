#!/usr/bin/env node
// Extracts frontmatter from a markdown file as JSON.
// Used by social-autopublish.yml for reliable YAML parsing.
// Usage: node scripts/extract-frontmatter.mjs path/to/file.md

import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node extract-frontmatter.mjs <file>');
  process.exit(1);
}

const content = readFileSync(filePath, 'utf8');
const { data } = matter(content);
console.log(JSON.stringify(data));
