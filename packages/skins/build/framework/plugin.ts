import { resolve } from 'node:path';

import type { Plugin } from 'vite';
import type { ComponentGraphProvider } from 'vjsc/graph';

import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import { formatGeneratedSource } from '../format.ts';
import { syncGeneratedFiles } from './files.ts';
import { createHtmlPackageSkins, htmlPackageSkinOwnedPaths } from './html.ts';
import { createReactPackageSkins, reactPackageSkinOwnedPaths } from './react.ts';

export interface FrameworkSkinsPluginOptions {
  readonly workspaceDir: string;
}

/** Generate ignored framework-package Skin inputs from the finalized VJSC component graph. */
export function frameworkSkinsPlugin(
  graph: ComponentGraphProvider<SkinModuleMeta>,
  options: FrameworkSkinsPluginOptions
): Plugin {
  return {
    name: 'skins:framework-packages',
    buildStart() {
      for (const path of [
        'packages/skins/framework/react/background/skin.tsx',
        'packages/skins/framework/react/background/skin.css',
        'packages/skins/framework/html/background/skin.ts',
        'packages/skins/framework/html/background/skin.css',
      ]) {
        this.addWatchFile(resolve(options.workspaceDir, path));
      }
    },
    async generateBundle() {
      if (!graph.api) this.error('Framework Skin generation requires a VJSC component graph plugin.');

      const graphApi = graph.api;
      if (!graphApi) return;

      const generated = await Promise.all([
        createReactPackageSkins(graphApi.getGraph(), options),
        createHtmlPackageSkins(graphApi.getGraph(), options),
      ]);
      const files = await Promise.all(
        generated.flat().map(async (file) => {
          if (!/\.[cm]?[jt]sx?$/.test(file.path)) return file;

          const formatted = await formatGeneratedSource(file.path, file.content);

          if (formatted.errors.length > 0) {
            const messages = formatted.errors.map((error) => error.message).join('\n');

            this.error(`Could not format generated framework Skin \`${file.path}\`:\n${messages}`);
          }

          return { ...file, content: formatted.code };
        })
      );
      const changed = await syncGeneratedFiles(options.workspaceDir, files, [
        ...reactPackageSkinOwnedPaths(),
        ...htmlPackageSkinOwnedPaths(),
      ]);

      if (changed > 0) this.info(`Generated ${changed} changed framework Skin file${changed === 1 ? '' : 's'}.`);
    },
  };
}
