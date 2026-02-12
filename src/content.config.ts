import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).min(1),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).min(1),
    url: z.string().url().optional(),
    repo: z.string().optional(),
    status: z.enum(['active', 'complete', 'archived', 'experiment']).default('active'),
    featured: z.boolean().default(false),
    heroImage: z.string().optional(),
    date: z.coerce.date(),
  }),
});

const gallery = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
    })),
    medium: z.string().optional(),
    collection: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

const audio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
    audioUrl: z.string(),
    duration: z.string().optional(),
    transcript: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog, projects, gallery, audio };
