import type { BuildPlugin } from './types.ts';

/** Rolldown external id for the shared CDN i18n registry module. */
export const CDN_I18N_REGISTRY = '@videojs/html/cdn/i18n-registry';

export interface CdnI18nExternalPluginOptions {
  prod: boolean;
}

/**
 * Keeps the i18n registry out of every CDN bundle by pointing them at the shared `i18n` entry.
 *
 * The rewritten specifier is always relative, so a mirrored copy of `cdn/` resolves entirely within its own origin and
 * works offline. Sharing one registry instance no longer depends on every bundle naming the same absolute URL —
 * `@videojs/core/i18n` keeps its state on `globalThis`, so duplicate instances converge on their own.
 */
export function cdnI18nExternalPlugin(options: CdnI18nExternalPluginOptions): BuildPlugin {
  const file = options.prod ? 'i18n.js' : 'i18n.dev.js';

  function isCdnI18nEntry(importer: string): boolean {
    const normalized = importer.replaceAll('\\', '/');

    return normalized.includes('/cdn/i18n.ts') || normalized.endsWith('/cdn/i18n.js');
  }

  return {
    name: 'cdn-i18n-external',

    resolveId(source, importer) {
      if (source === CDN_I18N_REGISTRY) {
        return { id: CDN_I18N_REGISTRY, external: true };
      }

      if (source === '@videojs/core/i18n' && importer && !isCdnI18nEntry(importer)) {
        return { id: CDN_I18N_REGISTRY, external: true };
      }

      return null;
    },

    renderChunk(code, chunk, _outputOptions, meta) {
      if (!code.includes(CDN_I18N_REGISTRY)) return null;

      // Resolve against the chunk's own depth: `i18n` sits at the output root, and chunks are
      // emitted at varying depths (`locales/es.js`, `media/mux-video/spf.js`).
      const depth = chunk.fileName.split('/').length - 1;
      const target = depth === 0 ? `./${file}` : `${'../'.repeat(depth)}${file}`;
      const magicString = meta?.magicString;
      if (!magicString) throw new Error('cdn-i18n-external requires experimental.nativeMagicString: true.');

      for (const quote of ['"', "'"]) {
        const source = `${quote}${CDN_I18N_REGISTRY}${quote}`;
        const replacement = `${quote}${target}${quote}`;
        let index = code.indexOf(source);

        while (index !== -1) {
          magicString.overwrite(index, index + source.length, replacement);
          index = code.indexOf(source, index + source.length);
        }
      }

      return { code: magicString };
    },
  };
}
