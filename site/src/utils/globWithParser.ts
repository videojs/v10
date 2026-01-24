import type { ParseDataOptions } from 'astro/loaders';

import { glob } from 'astro/loaders';

/**
 * Parser function that runs before Astro's schema validation.
 * Receives the entry and the original filename (before generateId transforms it).
 */
type Parser = <TData extends Record<string, unknown>>(
  options: ParseDataOptions<TData>,
  originalEntry: string
) => Promise<ParseDataOptions<TData>>;

type GlobWithParserOptions = Parameters<typeof glob>[0] & {
  parser: Parser;
};

/**
 * Wraps Astro's glob loader to provide a parser function that has access to both
 * the transformed entry and the original filename.
 *
 * This is useful when using generateId to transform entry IDs (e.g., for clean URLs)
 * but still needing the original filename to extract metadata (e.g., dates from filenames).
 *
 * @example
 * ```ts
 * loader: globWithParser({
 *   base: './src/content/blog',
 *   pattern: '**\/*.mdx',
 *   generateId: ({ entry }) => entry.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
 *   parser: async (entry, originalEntry) => {
 *     // entry.id = "my-post", originalEntry = "2024-01-01-my-post.mdx"
 *     const date = extractDateFromFilename(originalEntry);
 *     entry.data.pubDate = date;
 *     return entry;
 *   }
 * })
 * ```
 */
export function globWithParser({ parser, generateId, ...globOptions }: GlobWithParserOptions) {
  /**
   * Store mapping of transformed IDs to original entry filenames.
   * Created per-invocation to avoid memory leaks across builds.
   * This is needed because generateId transforms the entry name (e.g., removes date prefix),
   * but we need access to the original filename in the parser (e.g., to extract date from filename).
   */
  const entryMap = new Map<string, string>();

  // Wrap generateId to capture the original entry name before transformation
  // This allows us to maintain a mapping from the transformed ID back to the original filename
  const wrappedGenerateId = generateId
    ? (ctx: Parameters<NonNullable<typeof generateId>>[0]) => {
        const newId = generateId(ctx);
        // Store mapping: transformed ID -> original filename
        entryMap.set(newId, ctx.entry);
        return newId;
      }
    : undefined;

  // Create the base glob loader with our wrapped generateId
  const loader = glob({ ...globOptions, generateId: wrappedGenerateId });
  const originalLoad = loader.load;

  // Intercept the load function to inject our custom parser
  // This allows us to provide both the transformed entry and original filename to the parser
  loader.load = async ({ parseData, ...rest }) => {
    return originalLoad({
      parseData: async (entry) => {
        // Retrieve the original filename from our map, falling back to entry.id if not found
        const originalEntry = entryMap.get(entry.id) || entry.id;
        // Call user's parser with both the transformed entry and original filename
        return parseData(await parser(entry, originalEntry));
      },
      ...rest,
    });
  };

  return loader;
}
