import { file } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';
import { SUPPORTED_FRAMEWORKS } from './types/docs';
import { defaultGitService } from './utils/gitService';
import { globWithParser } from './utils/globWithParser';

/**
 * Extract date from filename in format: YYYY-MM-DD-slug.mdx
 * Throws an error if the filename doesn't match the expected pattern
 */
export function extractDateFromFilename(id: string): Date {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})-/);
  if (!match) {
    throw new Error(`Filename "${id}" must follow format: YYYY-MM-DD-slug.mdx`);
  }

  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}`);
}

const blog = defineCollection({
  // Load MDX files in the `src/content/blog/` directory.
  loader: globWithParser({
    base: './src/content/blog',
    pattern: '**/*.mdx',
    generateId: ({ entry }) => {
      // Remove date prefix and extension from slug (e.g., "2022-07-08-first-post.mdx" -> "first-post")
      return entry.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx$/, '');
    },
    parser: async (entry, originalEntry) => {
      // Extract pubDate from original filename (before date prefix was removed)
      const pubDate = extractDateFromFilename(originalEntry);

      // Get updatedDate from git history (last modification date)
      const filePath = `site/src/content/blog/${originalEntry}`;
      const updatedDate = await defaultGitService.getLastModifiedDate(filePath);

      // Return transformed entry with added fields
      return {
        ...entry,
        data: {
          ...entry.data,
          pubDate,
          ...(updatedDate && updatedDate.getTime() !== pubDate.getTime() ? { updatedDate } : {}),
        },
      };
    },
  }),
  // Type-check frontmatter using a schema
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      updatedDate: z.coerce.date().optional(),
      authors: z.array(reference('authors')),
      canonical: z.string().url().optional(),
      devOnly: z.boolean().optional(), // only visible in development mode
    }),
});

const docs = defineCollection({
  loader: globWithParser({
    base: './src/content/docs',
    pattern: '**/*.mdx',
    parser: async (entry, originalEntry) => {
      // Get updatedDate from git history
      const filePath = `site/src/content/docs/${originalEntry}`;
      const updatedDate = await defaultGitService.getLastModifiedDate(filePath);

      // Return transformed entry with added field if updatedDate exists
      return {
        ...entry,
        data: {
          ...entry.data,
          ...(updatedDate ? { updatedDate } : {}),
        },
      };
    },
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedDate: z.coerce.date().optional(),
    frameworkTitle: z.record(z.enum(SUPPORTED_FRAMEWORKS as [string, ...string[]]), z.string()).optional(),
  }),
});

const authors = defineCollection({
  loader: file('./src/content/authors.json'),
  schema: z.object({
    name: z.string(),
    shortName: z.string(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    socialLinks: z
      .object({
        x: z.string().optional(),
        bluesky: z.string().optional(),
        mastodon: z.string().optional(),
        github: z.string().optional(),
        linkedin: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { blog, docs, authors };
