import { globSync } from 'node:fs';

/** `@videojs/html` definition directories the CDN republishes, one bundle per module. */
export const CDN_HTML_SUBPATHS = ['media', 'extensions', 'ui'] as const;

export interface CdnEntry {
  /** Output name without extension, such as `media/mux-video/spf`. */
  readonly name: string;
  /** Module the bundle is built from, such as `@videojs/html/media/mux-video/spf`. */
  readonly src: string;
}

/**
 * Map one published `@videojs/html` definition, given relative to its `define/` directory, to the CDN bundle that
 * republishes it. A directory of flavors publishes its `index` under the directory name, matching the npm subpath.
 */
export function cdnHtmlEntry(file: string): CdnEntry {
  const name = file
    .replaceAll('\\', '/')
    .replace(/\/index\.js$/, '')
    .replace(/\.js$/, '');

  return { name, src: `@videojs/html/${name}` };
}

/**
 * One CDN bundle per module `@videojs/html` publishes under each definition directory, so the npm and CDN delivery
 * surfaces cannot drift. Returns nothing when the directory is absent: the config that calls this is loaded for every
 * workspace task, including before html has been built, and only `pack` needs the entries.
 */
export function cdnHtmlEntries(defineDir: string, subpaths: readonly string[] = CDN_HTML_SUBPATHS): CdnEntry[] {
  return subpaths.flatMap((subpath) =>
    globSync(`${subpath}/**/*.js`, { cwd: defineDir })
      .map(cdnHtmlEntry)
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}
