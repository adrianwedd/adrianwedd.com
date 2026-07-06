import { describe, it, expect } from 'vitest';
import { validateEntry, COLLECTIONS, MAX_DESCRIPTION_LENGTH } from '../../scripts/validate-content.js';

const blogRules = COLLECTIONS.blog;
const audioRules = COLLECTIONS.audio;
const galleryRules = COLLECTIONS.gallery;

function fm(fields: Record<string, string>): string {
  const body = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `---\n${body}\n---\n\nBody text.\n`;
}

describe('validateEntry — required fields', () => {
  it('accepts a complete blog entry', () => {
    const { errors } = validateEntry(
      fm({ title: 'Hello', description: 'A post', date: '2026-01-01', tags: '[a]' }),
      blogRules,
    );
    expect(errors).toEqual([]);
  });

  it('flags each missing required field', () => {
    const { errors } = validateEntry(fm({ title: 'Only title' }), blogRules);
    expect(errors).toContain("missing required field 'description'");
    expect(errors).toContain("missing required field 'date'");
    expect(errors).toContain("missing required field 'tags'");
  });

  it('treats a blank/whitespace field as missing', () => {
    const { errors } = validateEntry(
      fm({ title: '   ', description: 'x', date: '2026-01-01', tags: '[a]' }),
      blogRules,
    );
    expect(errors).toContain("missing required field 'title'");
  });
});

describe('validateEntry — description length boundary', () => {
  const base = { title: 'T', date: '2026-01-01', tags: '[a]' };

  it('accepts a description at exactly the limit', () => {
    const desc = 'x'.repeat(MAX_DESCRIPTION_LENGTH);
    const { errors } = validateEntry(fm({ ...base, description: desc }), blogRules);
    expect(errors).toEqual([]);
  });

  it('rejects a description one char over the limit', () => {
    const desc = 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const { errors } = validateEntry(fm({ ...base, description: desc }), blogRules);
    expect(errors.some((e: string) => e.startsWith('description is 161 chars'))).toBe(true);
  });
});

describe('validateEntry — audio media URL', () => {
  const base = { title: 'T', description: 'd', date: '2026-01-01', tags: '[a]' };

  it('requires audioUrl or videoUrl', () => {
    const { errors } = validateEntry(fm(base), audioRules);
    expect(errors).toContain("missing required field 'audioUrl' or 'videoUrl'");
  });

  it('accepts an entry with only audioUrl', () => {
    const { errors } = validateEntry(fm({ ...base, audioUrl: 'https://cdn/x.m4a' }), audioRules);
    expect(errors).toEqual([]);
  });
});

describe('validateEntry — duplicate frontmatter keys', () => {
  it('flags a repeated key that gray-matter would silently dedupe', () => {
    const raw = `---\ntitle: One\ndescription: d\ndate: 2026-01-01\ntags: [a]\ntitle: Two\n---\n\nBody.\n`;
    const { errors } = validateEntry(raw, blogRules);
    expect(errors).toContain("duplicate frontmatter key 'title'");
  });
});

describe('validateEntry — gallery images', () => {
  it('errors when the images array is missing', () => {
    const { errors } = validateEntry(fm({ title: 'G', date: '2026-01-01', tags: '[a]' }), galleryRules);
    expect(errors).toContain("missing or invalid 'images' array");
  });

  it('errors on an image missing src and warns on missing alt', () => {
    const raw = `---\ntitle: G\ndate: 2026-01-01\ntags: [a]\nimages:\n  - alt: only alt\n---\n\nBody.\n`;
    const { errors } = validateEntry(raw, galleryRules);
    expect(errors).toContain("images[0] missing 'src'");
  });
});

describe('validateEntry — heroImage existence predicate', () => {
  const base = { title: 'T', description: 'd', date: '2026-01-01', tags: '[a]' };

  it('warns when the predicate reports the image missing', () => {
    const { warnings } = validateEntry(fm({ ...base, heroImage: '/img/missing.webp' }), blogRules, {
      imageExists: () => false,
    });
    expect(warnings).toContain('heroImage not found in public/: /img/missing.webp');
  });

  it('does not warn for a remote heroImage URL', () => {
    const { warnings } = validateEntry(fm({ ...base, heroImage: 'https://cdn/x.webp' }), blogRules, {
      imageExists: () => false,
    });
    expect(warnings).toEqual([]);
  });

  it('skips the check entirely when no predicate is supplied', () => {
    const { warnings } = validateEntry(fm({ ...base, heroImage: '/img/x.webp' }), blogRules);
    expect(warnings).toEqual([]);
  });
});
