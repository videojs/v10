import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { baseConfig } from '../../../build/pack.ts';
// Vite+ loads this config before it can schedule builds, so bootstrap the private compiler from source.
import { createOxfmtSourceFormatter } from '../../vjsc/src/output/index.ts';
import { shadcnRegistryPlugin, vjscPlugin } from '../../vjsc/src/plugins/index.ts';
import { frameworkSkinsPlugin } from '../build/framework/plugin.ts';
import { configureRegistryModule, packageDir, registryAssetsOnly, registryGraph, registryUtils } from './configure.ts';
import { registryItems } from './items/index.ts';
import { registryPackages, registryPaths, registryTargets } from './targets.ts';

const formatSource = createOxfmtSourceFormatter({
  configure: (path) =>
    path.endsWith('.html')
      ? null
      : {
          arrowParens: 'always',
          bracketSpacing: true,
          jsdoc: true,
          printWidth: 120,
          semi: true,
          singleQuote: !path.endsWith('.css'),
          sortImports: true,
          tabWidth: 2,
          trailingComma: 'es5',
        },
});

export const registryPackConfig: PackUserConfig = {
  ...baseConfig,
  name: 'skins-registry',
  cwd: packageDir,
  entry: { registry: registryUtils },
  outDir: 'dist/registry/source',
  clean: true,
  dts: false,
  sourcemap: false,
  platform: 'browser',
  format: 'es',
  deps: {
    neverBundle: true,
    onlyBundle: false,
  },
  plugins: [
    vjscPlugin({ configure: configureRegistryModule }),
    registryGraph,
    ...registryTargets.map((target) =>
      shadcnRegistryPlugin(registryGraph, {
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
        meta: { framework: target.framework, style: target.styling },
        items: registryItems(target),
      })
    ),
    frameworkSkinsPlugin(registryGraph, {
      workspaceDir: resolve(packageDir, '../..'),
      format: formatSource,
    }),
    registryAssetsOnly(),
  ],
};

export default defineConfig({ pack: registryPackConfig });
