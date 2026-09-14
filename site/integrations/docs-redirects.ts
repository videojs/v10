import type { AstroIntegration } from 'astro';

import { sidebar } from '../src/docs.config';
import { SUPPORTED_FRAMEWORKS } from '../src/types/docs';
import { collectDocsRedirects } from '../src/utils/docs/redirects';

/**
 * Turn each sidebar entry's `redirectFrom` into Astro redirects. The Netlify adapter writes them to `_redirects`, which
 * takes precedence over the hand-maintained rules in netlify.toml, and the dev server honours them too.
 */
export default function docsRedirects(): AstroIntegration {
  return {
    name: 'docs-redirects',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, logger }) => {
        const redirects = collectDocsRedirects(sidebar, SUPPORTED_FRAMEWORKS);
        if (redirects.length === 0) return;

        const merged = { ...config.redirects };

        for (const { from, to } of redirects) merged[from] = to;

        updateConfig({ redirects: merged });
        logger.info(`Registered ${redirects.length} redirects for moved docs pages.`);
      },
    },
  };
}
