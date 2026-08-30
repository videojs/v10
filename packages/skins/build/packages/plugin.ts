import { resolve } from 'node:path';

import type { Plugin } from 'vite';
import { findVjscGraph, type VjscGraph } from 'vjsc/graph';

import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import type { GeneratedPackageFile } from './files.ts';
import { syncGeneratedFiles } from './files.ts';
import { createHtmlPackageSkins, htmlPackageSkinOwnedPaths } from './html.ts';
import { createReactPackageSkins, reactPackageSkinOwnedPaths } from './react.ts';

export interface PackageSkinsPluginOptions {
  readonly workspaceDir: string;
  readonly format?: ((source: GeneratedPackageFile) => string | Promise<string>) | undefined;
}

/** Generate ignored React and HTML package Skin inputs from the finalized VJSC component graph. */
export function packageSkinsPlugin(options: PackageSkinsPluginOptions): Plugin {
  let graph: VjscGraph<SkinModuleMeta> | undefined;

  return {
    name: 'skins:packages',
    buildStart(inputOptions) {
      graph = findVjscGraph<SkinModuleMeta>(inputOptions.plugins);

      if (!graph) this.error('Package Skin generation requires vjscPlugin in the same build.');

      for (const path of [
        'packages/skins/presets/background/react.tsx',
        'packages/skins/presets/background/react.css',
        'packages/skins/presets/background/html.ts',
        'packages/skins/presets/background/html.css',
      ]) {
        this.addWatchFile(resolve(options.workspaceDir, path));
      }
    },
    async generateBundle() {
      if (!graph) this.error('Package Skin generation requires vjscPlugin in the same build.');

      const profile = process.env.VIDEOJS_PROFILE_SKINS === '1';
      const generateStarted = performance.now();

      const [react, html] = await Promise.all([
        timed(() => createReactPackageSkins(graph, options)),
        timed(() => createHtmlPackageSkins(graph, options)),
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

      if (changed > 0) this.info(`Generated ${changed} changed package Skin file${changed === 1 ? '' : 's'}.`);
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
