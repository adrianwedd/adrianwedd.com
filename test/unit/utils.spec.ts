import { describe, it, expect } from 'vitest';
import { slug, imageSlug, youtubeId, ogSafeImage, heroAltText } from '../../src/lib/utils';

describe('slug', () => {
  it('passes through an id with no extension or -post suffix', () => {
    expect(slug('my-first-article')).toBe('my-first-article');
  });

  it('strips a trailing .md / .mdx extension (Astro 5 leak)', () => {
    expect(slug('foo.md')).toBe('foo');
    expect(slug('foo.mdx')).toBe('foo');
  });

  it('strips the -post naming-convention suffix', () => {
    expect(slug('agent-in-the-walls-post')).toBe('agent-in-the-walls');
  });

  it('strips -post together with an extension', () => {
    expect(slug('agent-post.md')).toBe('agent');
    expect(slug('agent-post.mdx')).toBe('agent');
  });

  it('only strips -post at the end, not mid-slug', () => {
    expect(slug('post-mortem')).toBe('post-mortem');
    expect(slug('my-post-notes')).toBe('my-post-notes');
  });
});

describe('imageSlug', () => {
  it('lowercases and hyphenates alt text', () => {
    expect(imageSlug('Sunset Over Hobart')).toBe('sunset-over-hobart');
  });

  it('collapses runs of non-alphanumerics to a single hyphen', () => {
    expect(imageSlug('A  --  B__C!!D')).toBe('a-b-c-d');
  });

  it('trims leading and trailing hyphens', () => {
    expect(imageSlug('  !edge!  ')).toBe('edge');
  });

  it('falls back to "image" when nothing survives', () => {
    expect(imageSlug('!!!')).toBe('image');
    expect(imageSlug('')).toBe('image');
  });
});

describe('youtubeId', () => {
  it('extracts from watch?v= URLs', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be short links', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed / shorts / live / v paths', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('handles nocookie and subdomain hosts', () => {
    expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects malformed input and non-YouTube hosts', () => {
    expect(youtubeId(null)).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
    expect(youtubeId('not a url')).toBeNull();
    expect(youtubeId('https://vimeo.com/12345')).toBeNull();
  });

  it('rejects ids that are not exactly 11 canonical chars (the XSS anchor)', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ<script>')).toBeNull();
    expect(youtubeId('https://youtu.be/toolongvideoid123')).toBeNull();
  });
});

describe('ogSafeImage', () => {
  it('swaps a .webp extension to .jpg', () => {
    expect(ogSafeImage('/og/foo.webp')).toBe('/og/foo.jpg');
  });

  it('swaps .webp before a query string or hash', () => {
    expect(ogSafeImage('/og/foo.webp?v=2')).toBe('/og/foo.jpg?v=2');
    expect(ogSafeImage('/og/foo.webp#frag')).toBe('/og/foo.jpg#frag');
  });

  it('is case-insensitive on the extension', () => {
    expect(ogSafeImage('/og/foo.WEBP')).toBe('/og/foo.jpg');
  });

  it('passes non-webp paths through unchanged', () => {
    expect(ogSafeImage('/og/foo.png')).toBe('/og/foo.png');
    expect(ogSafeImage('/og/webp-in-name.jpg')).toBe('/og/webp-in-name.jpg');
  });
});

describe('heroAltText', () => {
  it('returns an authored heroAlt verbatim', () => {
    expect(heroAltText({ heroAlt: 'A custom description', title: 'X', kind: 'article' })).toBe('A custom description');
  });

  it('describes infographic heroes for articles and projects', () => {
    expect(heroAltText({ heroImage: '/notebook-assets/x/infographic.webp', title: 'My Post', kind: 'article' })).toBe(
      'Infographic summarising the article: “My Post”',
    );
    expect(heroAltText({ heroImage: '/foo/infographic.png', title: 'My Proj', kind: 'project' })).toBe(
      'Infographic summarising the project: “My Proj”',
    );
  });

  it('returns empty (decorative) alt for a non-infographic hero with no authored alt', () => {
    expect(heroAltText({ heroImage: '/photos/beach.jpg', title: 'Beach', kind: 'article' })).toBe('');
    expect(heroAltText({ title: 'No hero', kind: 'article' })).toBe('');
  });
});
