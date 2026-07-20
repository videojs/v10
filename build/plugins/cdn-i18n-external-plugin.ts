import type { BuildPlugin } from './types.ts';

/** Rolldown external id for the shared CDN i18n registry module. */
export const CDN_I18N_REGISTRY = '@videojs/html/cdn/i18n-registry';

export interface CdnI18nExternalPluginOptions {
  prod: boolean;
  version: string;
}

export function cdnI18nExternalPlugin(options: CdnI18nExternalPluginOptions): BuildPlugin {
  const url = `https://cdn.jsdelivr.net/npm/@videojs/html@${options.version}/cdn/i18n.js`;
  const devFile = 'i18n.dev.js';

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

    renderChunk(code, chunk) {
      if (!code.includes(CDN_I18N_REGISTRY)) return null;

      const rel = chunk.fileName.includes('locales/')
        ? `../${options.prod ? 'i18n.js' : devFile}`
        : `./${options.prod ? 'i18n.js' : devFile}`;
      const target = options.prod ? url : rel;

      return {
        code: code
          .replaceAll(`"${CDN_I18N_REGISTRY}"`, `"${target}"`)
          .replaceAll(`'${CDN_I18N_REGISTRY}'`, `'${target}'`),
      };
    },
  };
}
