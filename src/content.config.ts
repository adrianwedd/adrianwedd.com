import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notebookAssets = {
  audioUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  infographic: z.string().optional(),
  mindmap: z.string().optional(),
  quiz: z.string().optional(),
  flashcards: z.string().optional(),
  dataTable: z.string().optional(),
  slides: z.string().optional(),
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).min(1),
    draft: z.boolean().default(false),
    explicit: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    ...notebookAssets,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).min(1),
    url: z.string().url().optional(),
    repo: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    status: z.enum(['active', 'complete', 'archived', 'experiment']).default('active'),
    featured: z.boolean().default(false),
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    date: z.coerce.date(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    ...notebookAssets,
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    draft: z.boolean().default(false),
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    ),
    medium: z.string().optional(),
    collection: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

const audio = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/audio' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    draft: z.boolean().default(false),
    ...notebookAssets,
    audioUrl: z.string().optional(),
    duration: z.string().optional(),
    transcript: z.string().optional(),
    heroImage: z.string().optional(),
    explicit: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    relatedProject: z.string().optional(),
    relatedPost: z.string().optional(),
  }),
});

const fixes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/fixes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    category: z.string(),
    draft: z.boolean().default(false),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    category: z.string(),
    url: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects, gallery, audio, fixes, 'case-studies': caseStudies };
