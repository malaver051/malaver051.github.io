import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Astro 7 Content Layer API: each collection declares a `loader`.
// Authors add Markdown/MDX files under the `base` directories below.
const works = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      tech: z.array(z.string()),
      link: z.string().url().optional(),
      repo: z.string().url().optional(),
      thumbnail: image().optional(),
      order: z.number().optional(),
      publishDate: z.coerce.date(),
    }),
});

// Evidencias del curso (talleres, retos), agrupadas por categoría en /evidencias/.
const evidencias = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/evidencias' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    categoria: z.enum(['SQL', 'PL/SQL', 'NoSQL', 'Proyecto']),
    tech: z.array(z.string()),
    integrantes: z.array(z.string()).optional(),
    /** Archivo descargable dentro de public/, por ejemplo `/evidencias/taller.sql`. */
    archivo: z.string().optional(),
    fecha: z.coerce.date().optional(),
    order: z.number().optional(),
  }),
});

export const collections = { works, evidencias };
