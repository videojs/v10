import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { vjscPlugin, vjscRegistryPlugin } from '../../vjsc/src/plugins/index.ts';
import { packageDir, resolveBuildComponents, resolveBuildStyles, skinEntries, skinUtils } from './config.ts';
import { packageSkinsPlugin } from './packages/plugin.ts';
import { formatSource } from './registry/format.ts';
import { registryItems } from './registry/items/index.ts';
import { registryStyles } from './registry/items/styles.ts';
import { registryPackages, registryPaths, registryTargets } from './registry/targets.ts';

export const skinBuildConfig: PackUserConfig = {
  name: 'skins',
  cwd: packageDir,
  entry: { registry: skinUtils },
  outDir: 'dist/registry/source',
  clean: true,
  dts: false,
  sourcemap: false,
  platform: 'browser',
  format: 'es',
  inputOptions: {
    experimental: {
      nativeMagicString: true,
    },
  },
  ignoreWatch: [/[/\\]packages[/\\][^/\\]+[/\\]dist(?:[/\\]|$)/],
  report: process.env.CI === 'true',
  deps: {
    neverBundle: true,
    onlyBundle: false,
  },
  plugins: [
    vjscPlugin({
      entries: skinEntries,
      transform: {
        components: resolveBuildComponents,
        styles: resolveBuildStyles,
      },
    }),
    ...registryTargets.map((target) =>
      vjscRegistryPlugin({
        name: 'videojs',
        homepage: 'https://videojs.org',
        namespace: '@videojs',
        output: target.output,
        format: formatSource,
        paths: registryPaths,
        imports: {
          '@videojs/utils/style': `${registryPaths.import}/lib/resolve-class-name`,
        },
        packages: registryPackages,
        meta: {
          framework: target.framework,
          style: target.styling,
        },
        items: registryItems(target),
        styles: registryStyles(target),
      })
    ),
    packageSkinsPlugin({
      workspaceDir: resolve(packageDir, '../..'),
      format: formatSource,
    }),
    {
      name: 'skins:static-registry-output',
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          for (const filename of Object.keys(bundle)) {
            if (!filename.startsWith('r/')) delete bundle[filename];
          }
        },
      },
    },
  ],
};

export default defineConfig({ pack: skinBuildConfig });
