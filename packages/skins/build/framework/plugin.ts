import { resolve } from 'node:path';

import type { Plugin } from 'vite';
import type { ComponentGraphProvider } from 'vjsc/graph';
import type { SourceFormatter } from 'vjsc/output';

import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import { syncGeneratedFiles } from './files.ts';
import { createHtmlPackageSkins, htmlPackageSkinOwnedPaths } from './html.ts';
import { createReactPackageSkins, reactPackageSkinOwnedPaths } from './react.ts';

export interface FrameworkSkinsPluginOptions {
  readonly workspaceDir: string;
  readonly format?: SourceFormatter | undefined;
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

      const profile = process.env.VIDEOJS_PROFILE_SKINS === '1';
      const generateStarted = performance.now();

      const [react, html] = await Promise.all([
        timed(() => createReactPackageSkins(graphApi.getGraph(), options)),
        timed(() => createHtmlPackageSkins(graphApi.getGraph(), options)),
      ]);

      const generated = [react.value, html.value];
      const generateEnded = performance.now();

      const files = await Promise.all(
        generated.flat().map(async (file) => {
          if (!options.format || !/\.(?:css|html|[cm]?[jt]sx?)$/.test(file.path)) return file;

          return { ...file, content: await options.format(file) };
        })
      );

      const formatEnded = performance.now();

      const changed = await syncGeneratedFiles(options.workspaceDir, files, [
        ...reactPackageSkinOwnedPaths(),
        ...htmlPackageSkinOwnedPaths(),
      ]);

      const syncEnded = performance.now();

      if (profile) {
        this.info(
          `Profile: React ${duration(0, react.elapsed)}, HTML ${duration(0, html.elapsed)}, total render ${duration(generateStarted, generateEnded)}, format ${duration(generateEnded, formatEnded)}, sync ${duration(formatEnded, syncEnded)}.`
        );
      }

      if (changed > 0) this.info(`Generated ${changed} changed framework Skin file${changed === 1 ? '' : 's'}.`);
    },
  };
}

async function timed<Value>(task: () => Promise<Value>): Promise<{ readonly elapsed: number; readonly value: Value }> {
  const started = performance.now();
  const value = await task();

  return { elapsed: performance.now() - started, value };
}

function duration(start: number, end: number): string {
  return `${((end - start) / 1000).toFixed(2)}s`;
}
