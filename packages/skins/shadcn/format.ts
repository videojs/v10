import { isString } from '@videojs/utils/predicate';
import type { Plugin } from 'vite';

import { formatGeneratedSource } from '../build/format.ts';

const sourceFile = /\.(?:css|[cm]?[jt]sx?)$/;

/** Format editable registry source before Shadcn embeds it in installable item JSON. */
export function formatRegistrySources(): Plugin {
  return {
    name: 'videojs:format-registry-sources',
    async generateBundle(_options, bundle) {
      await Promise.all(
        Object.values(bundle).map(async (asset) => {
          if (asset.type !== 'asset' || !isString(asset.source) || !sourceFile.test(asset.fileName)) return;

          const result = await formatGeneratedSource(asset.fileName, asset.source);

          if (result.errors.length > 0) {
            const messages = result.errors.map((error) => error.message).join('\n');

            throw new Error(`Could not format generated registry source \`${asset.fileName}\`:\n${messages}`);
          }

          asset.source = result.code;
        })
      );
    },
  };
}
