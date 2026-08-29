import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { relative, resolve, sep } from 'node:path';

import { chromium } from '@playwright/test';
import { isPlainObject, isString } from '@videojs/utils/predicate';
import { registryItemSchema, registrySchema, type RegistryItem } from 'shadcn/schema';

import { formatRegistrySource } from '../shadcn/format';

const packageDir = resolve(import.meta.dirname, '..');
const workspaceDir = resolve(packageDir, '../..');
const registryDir = resolve(packageDir, 'dist/registry');
const sourceDir = resolve(registryDir, 'source');
const hostedDir = resolve(registryDir, 'r');
const shadcnBin = resolve(packageDir, 'node_modules/shadcn/dist/index.js');
const generatedSource = /\.(?:css|[cm]?[jt]sx?)$/;
const videojsPackages = ['utils', 'element', 'store', 'media', 'spf', 'core', 'react'] as const;
const registryPackages = [...videojsPackages, 'html'] as const;
const catalogs = [
  { name: 'React Tailwind', path: 'react' },
  { name: 'React CSS', path: 'react/css' },
  { name: 'HTML Tailwind', path: 'html' },
  { name: 'HTML CSS', path: 'html/css' },
] as const;

const validatedItems = await Promise.all(catalogs.map(validateCatalog));

await assertPackagePins(validatedItems.flat());
await assertIgnoredOutput();

const server = createServer();
const address = await listen(server);

server.on('request', async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', address).pathname).replace(/^\/+/, '');
  const path = resolve(registryDir, pathname);
  const source = path.startsWith(`${registryDir}${sep}`) ? await readFile(path).catch(() => undefined) : undefined;

  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('cache-control', 'no-store');

  if (!source) {
    response.statusCode = 404;
    response.end('Not found.');
    return;
  }

  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(source);
});

const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'videojs-shadcn-next-'));

try {
  await validateDiscovery(address);

  const tarballs = await packVideojsPackages(resolve(fixtureRoot, 'packages'));

  await validateNextFixture({ address, root: resolve(fixtureRoot, 'tailwind'), styling: 'tailwind', tarballs });
  await validateNextFixture({ address, root: resolve(fixtureRoot, 'css'), styling: 'css', tarballs });
  await validateHtmlFixture({
    address,
    root: resolve(fixtureRoot, 'html-tailwind'),
    styling: 'tailwind',
    tarballs,
  });
  await validateHtmlFixture({ address, root: resolve(fixtureRoot, 'html-css'), styling: 'css', tarballs });
} finally {
  await close(server);

  if (process.env.VIDEOJS_KEEP_SHADCN_FIXTURE === '1') {
    console.log(`Kept Shadcn fixture at ${fixtureRoot}.`);
  } else {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

console.log('Validated all hosted catalogs and clean React/Next.js and HTML/Vite installs for Tailwind and CSS.');

async function validateCatalog(catalog: (typeof catalogs)[number]): Promise<RegistryItem[]> {
  const sourceRegistry = resolve(sourceDir, 'r', catalog.path, 'registry.json');
  const output = resolve(hostedDir, catalog.path);
  const registry = registrySchema.parse(JSON.parse(await readFile(resolve(output, 'registry.json'), 'utf8')));
  const files = (await readdir(output, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  const expected = ['registry.json', ...registry.items.map((item) => `${item.name}.json`)].sort();

  if (files.join('\n') !== expected.join('\n')) {
    throw new Error(
      `${catalog.name} hosted files do not match its catalog.\nExpected: ${expected.length}\nActual: ${files.length}`
    );
  }

  await runShadcn(['registry', 'validate', sourceRegistry, '--cwd', packageDir], packageDir);

  return Promise.all(
    registry.items.map(async (manifest) => {
      const item = registryItemSchema.parse(
        JSON.parse(await readFile(resolve(output, `${manifest.name}.json`), 'utf8'))
      );
      if (item.name !== manifest.name) throw new Error(`${catalog.name} item name mismatch: ${manifest.name}.`);

      for (const file of item.files ?? []) {
        if (!file.content || !generatedSource.test(file.target ?? file.path)) continue;

        const formatted = await formatRegistrySource(file.target ?? file.path, file.content);

        if (formatted.errors.length > 0 || formatted.code !== file.content) {
          throw new Error(`${catalog.name} source is not formatted: ${item.name}/${file.path}.`);
        }
      }

      return item;
    })
  );
}

async function validateDiscovery(address: string): Promise<void> {
  const root = resolve(fixtureRoot, 'discovery');

  await mkdir(root, { recursive: true });

  for (const catalog of catalogs) {
    const registryUrl = `${address}/r/${catalog.path}/registry.json`;
    const search = await runShadcn(
      ['search', registryUrl, '--query', 'video', '--limit', '5', '--json', '--cwd', root],
      root
    );
    const result = JSON.parse(search.stdout);

    if (!isPlainObject(result) || !Array.isArray(result.items)) {
      throw new Error(`${catalog.name} search did not return an item list.`);
    }

    const names = result.items.flatMap((item) => (isPlainObject(item) && isString(item.name) ? [item.name] : []));
    if (!names.includes('video')) throw new Error(`${catalog.name} search did not return \`video\`.`);

    const view = await runShadcn(['view', `${address}/r/${catalog.path}/video.json`, '--cwd', root], root);
    if (!view.stdout.includes('"name": "video"')) throw new Error(`${catalog.name} view did not return \`video\`.`);
  }
}

async function validateNextFixture(config: {
  address: string;
  root: string;
  styling: 'tailwind' | 'css';
  tarballs: ReadonlyMap<string, string>;
}): Promise<void> {
  await writeNextFixture(config);
  await runCommand('pnpm', ['install', '--no-frozen-lockfile'], config.root);

  if (config.styling === 'tailwind') {
    await runShadcn(['init', '--defaults', '--yes', '--silent', '--cwd', config.root], config.root);
  }

  await configureRegistryNamespace(config);

  await add(config.root, ['@videojs/video']);
  await assertInstalled(config.root, [
    'components/videojs/skins/video/skin.tsx',
    'components/videojs/ui/play-button.tsx',
    'components/videojs/styles/theme.css',
    'lib/utils.ts',
  ]);

  if (config.styling === 'css') {
    await assertInstalled(config.root, [
      'components/videojs/skins/video/skin.css',
      'components/videojs/styles/button.css',
    ]);
  }

  const sharedBefore = await sourceHashes(resolve(config.root, 'components/videojs/ui'));

  await add(config.root, ['@videojs/video-minimal']);
  await assertInstalled(config.root, ['components/videojs/skins/video/minimal/skin.tsx']);

  const sharedAfter = await sourceHashes(resolve(config.root, 'components/videojs/ui'));

  if (JSON.stringify(sharedBefore) !== JSON.stringify(sharedAfter)) {
    throw new Error(`${config.styling} minimal install changed shared component source.`);
  }

  await installPackedDependencies(config.root, config.tarballs, 'react');
  await writePlayer(config.root, config.styling);
  await runCommand('pnpm', ['build'], config.root);
  await runCommand('pnpm', ['lint'], config.root);
  await validateRuntime(config.root, config.styling);
}

async function validateHtmlFixture(config: {
  address: string;
  root: string;
  styling: 'tailwind' | 'css';
  tarballs: ReadonlyMap<string, string>;
}): Promise<void> {
  await writeHtmlFixture(config);
  await runCommand('pnpm', ['install', '--no-frozen-lockfile'], config.root);
  await add(config.root, ['@videojs/video']);
  await assertInstalled(config.root, [
    'src/components/videojs/skins/video/skin.html',
    'src/components/videojs/skins/video/skin.ts',
  ]);

  if (config.styling === 'tailwind') {
    await assertInstalled(config.root, ['src/components/videojs/styles/theme.css']);
  } else {
    await assertInstalled(config.root, ['src/components/videojs/skins/video/skin.css']);
  }

  await installPackedDependencies(config.root, config.tarballs, 'html');
  await writeHtmlComposition(config.root);
  await runCommand('pnpm', ['check'], config.root);
  await runCommand('pnpm', ['build'], config.root);
  await validateHtmlRuntime(config.root, config.styling);
}

async function installPackedDependencies(
  root: string,
  tarballs: ReadonlyMap<string, string>,
  framework: 'html' | 'react'
): Promise<void> {
  const filename = resolve(root, 'package.json');
  const manifest = JSON.parse(await readFile(filename, 'utf8'));

  for (const name of Object.keys(manifest.dependencies)) {
    const tarball = tarballs.get(name);

    if (tarball) manifest.dependencies[name] = tarball;
  }

  await writeFile(filename, `${JSON.stringify(manifest, null, 2)}\n`);
  await runCommand('pnpm', ['install', '--no-frozen-lockfile'], root);

  if (framework === 'react') {
    const compoundTypes = await readFile(
      resolve(root, 'node_modules/@videojs/react/dist/dev/ui/audio-track-radio-group/index.parts.d.ts'),
      'utf8'
    );

    if (!compoundTypes.includes('Options')) {
      throw new Error('The Next.js fixture did not install the packed @videojs/react artifact.');
    }
  } else {
    const menuTypes = await readFile(
      resolve(root, 'node_modules/@videojs/html/dist/dev/ui/menu/menu-element.d.ts'),
      'utf8'
    );

    if (!menuTypes.includes('Content pages are direct children')) {
      throw new Error('The Vite fixture did not install the packed @videojs/html artifact.');
    }
  }
}

async function writeNextFixture(config: {
  address: string;
  root: string;
  styling: 'tailwind' | 'css';
  tarballs: ReadonlyMap<string, string>;
}): Promise<void> {
  const overrides = Object.fromEntries(config.tarballs);
  const coreTarball = requiredTarball(config.tarballs, '@videojs/core');
  const reactTarball = requiredTarball(config.tarballs, '@videojs/react');
  const devDependencies = {
    '@types/node': '22.18.6',
    '@types/react': '19.2.17',
    '@types/react-dom': '19.2.3',
    '@tailwindcss/postcss': config.styling === 'tailwind' ? '4.3.3' : undefined,
    eslint: '^9.0.0',
    'eslint-config-next': '16.3.3',
    tailwindcss: config.styling === 'tailwind' ? '4.3.3' : undefined,
    typescript: '5.9.3',
  };

  const packageJson = {
    name: `videojs-shadcn-${config.styling}-validation`,
    private: true,
    version: '0.0.0',
    packageManager: 'pnpm@11.17.0',
    scripts: {
      build: 'next build',
      lint: 'eslint .',
      start: 'next start',
    },
    dependencies: {
      '@videojs/core': coreTarball,
      '@videojs/react': reactTarball,
      clsx: '2.1.1',
      next: '16.3.3',
      react: '19.2.8',
      'react-dom': '19.2.8',
      'tailwind-merge': '3.5.0',
    },
    devDependencies,
  };
  const components = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: true,
    tsx: true,
    tailwind: {
      config: '',
      css: 'app/globals.css',
      baseColor: 'neutral',
      cssVariables: true,
      prefix: '',
    },
    iconLibrary: 'lucide',
    aliases: {
      components: '@/components',
      ui: '@/components/ui',
      utils: '@/lib/utils',
      lib: '@/lib',
      hooks: '@/hooks',
    },
    registries: {
      '@videojs': `${config.address}/r/react${config.styling === 'css' ? '/css' : ''}/{name}.json`,
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'react-jsx',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };

  await mkdir(resolve(config.root, 'app'), { recursive: true });
  await writeFile(resolve(config.root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

  if (config.styling === 'css') {
    await writeFile(resolve(config.root, 'components.json'), `${JSON.stringify(components, null, 2)}\n`);
  }

  await writeFile(resolve(config.root, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`);
  await writeFile(
    resolve(config.root, 'next.config.ts'),
    `import type { NextConfig } from 'next';\n\nexport default {} satisfies NextConfig;\n`
  );
  await writeFile(resolve(config.root, 'pnpm-workspace.yaml'), workspaceConfig(overrides));
  await writeFile(
    resolve(config.root, 'next-env.d.ts'),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
  );
  await writeFile(
    resolve(config.root, 'eslint.config.mjs'),
    `import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
`
  );
  await writeFile(
    resolve(config.root, 'app/layout.tsx'),
    `import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = { title: 'Video.js registry validation' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
  );
  await writeFile(
    resolve(config.root, 'app/page.tsx'),
    `import { Player } from './player';

export default function Page() {
  return (
    <main style={{ margin: '2rem auto', width: 'min(90vw, 48rem)' }}>
      <h1>Video.js registry validation</h1>
      <Player />
    </main>
  );
}
`
  );
  await writeFile(
    resolve(config.root, 'app/globals.css'),
    config.styling === 'tailwind'
      ? '@import "tailwindcss";\n'
      : 'html { color-scheme: dark; }\nbody { margin: 0; background: #111; color: #fff; font-family: sans-serif; }\n'
  );

  if (config.styling === 'tailwind') {
    await writeFile(
      resolve(config.root, 'postcss.config.mjs'),
      `export default { plugins: { '@tailwindcss/postcss': {} } };\n`
    );
  }
}

async function configureRegistryNamespace(config: {
  address: string;
  root: string;
  styling: 'tailwind' | 'css';
}): Promise<void> {
  const filename = resolve(config.root, 'components.json');
  const components = JSON.parse(await readFile(filename, 'utf8'));

  components.registries = {
    ...components.registries,
    '@videojs': `${config.address}/r/react${config.styling === 'css' ? '/css' : ''}/{name}.json`,
  };

  await writeFile(filename, `${JSON.stringify(components, null, 2)}\n`);
}

async function writeHtmlFixture(config: {
  address: string;
  root: string;
  styling: 'tailwind' | 'css';
  tarballs: ReadonlyMap<string, string>;
}): Promise<void> {
  const overrides = Object.fromEntries(config.tarballs);
  const htmlTarball = requiredTarball(config.tarballs, '@videojs/html');
  const packageJson = {
    name: `videojs-shadcn-html-${config.styling}-validation`,
    private: true,
    version: '0.0.0',
    packageManager: 'pnpm@11.17.0',
    scripts: {
      build: 'vite build',
      check: 'tsc --noEmit',
      start: 'vite preview',
    },
    dependencies: {
      '@videojs/html': htmlTarball,
    },
    devDependencies: {
      '@tailwindcss/vite': config.styling === 'tailwind' ? '4.3.3' : undefined,
      tailwindcss: config.styling === 'tailwind' ? '4.3.3' : undefined,
      typescript: '5.9.3',
      vite: '8.2.2',
    },
  };
  const components = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: false,
    tsx: true,
    tailwind: {
      config: '',
      css: 'src/app.css',
      baseColor: 'neutral',
      cssVariables: true,
      prefix: '',
    },
    iconLibrary: 'lucide',
    aliases: {
      components: '@/components',
      ui: '@/components/ui',
      utils: '@/lib/utils',
      lib: '@/lib',
      hooks: '@/hooks',
    },
    registries: {
      '@videojs': `${config.address}/r/html${config.styling === 'css' ? '/css' : ''}/{name}.json`,
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      allowJs: false,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      paths: { '@/*': ['./src/*'] },
      types: ['vite/client'],
    },
    include: ['src', 'vite.config.ts'],
  };
  const viteConfig =
    config.styling === 'tailwind'
      ? `import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
`
      : `import { defineConfig } from 'vite';

export default defineConfig({});
`;

  await mkdir(resolve(config.root, 'src'), { recursive: true });
  await writeFile(resolve(config.root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(resolve(config.root, 'components.json'), `${JSON.stringify(components, null, 2)}\n`);
  await writeFile(resolve(config.root, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`);
  await writeFile(resolve(config.root, 'pnpm-workspace.yaml'), workspaceConfig(overrides));
  await writeFile(resolve(config.root, 'vite.config.ts'), viteConfig);
  await writeFile(
    resolve(config.root, 'src/app.css'),
    config.styling === 'tailwind'
      ? '@import "tailwindcss";\n'
      : 'html { color-scheme: dark; }\nbody { margin: 0; background: #111; color: #fff; font-family: sans-serif; }\n'
  );
}

async function writeHtmlComposition(root: string): Promise<void> {
  const skin = await readFile(resolve(root, 'src/components/videojs/skins/video/skin.html'), 'utf8');
  const composition = skin
    .replace('<media-container', '<media-container style="aspect-ratio: 16 / 9; width: min(90vw, 48rem)"')
    .replace(
      '<!-- Add a compatible media element here. -->',
      '<hlsjs-video aria-label="Validation video"></hlsjs-video>'
    );

  await writeFile(
    resolve(root, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video.js registry validation</title>
  </head>
  <body>
    <main style="display: grid; min-height: 100vh; place-items: center">
      <video-player>${composition}</video-player>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
  );
  await writeFile(
    resolve(root, 'src/main.ts'),
    `import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';

import './app.css';
import './components/videojs/skins/video/skin';
`
  );
}

function requiredTarball(tarballs: ReadonlyMap<string, string>, name: string): string {
  const tarball = tarballs.get(name);
  if (!tarball) throw new Error(`Missing packed artifact for ${name}.`);

  return tarball;
}

function workspaceConfig(overrides: Readonly<Record<string, string>>): string {
  const entries = Object.entries(overrides)
    .map(([name, value]) => `  '${name}': '${value}'`)
    .join('\n');

  return `packages:\n  - '.'\n\nallowBuilds:\n  'unrs-resolver@1.12.2': true\n\noverrides:\n${entries}\n`;
}

async function writePlayer(root: string, styling: 'tailwind' | 'css'): Promise<void> {
  const skinProps =
    styling === 'tailwind' ? 'className="aspect-video w-full"' : "style={{ aspectRatio: '16 / 9', width: '100%' }}";

  await writeFile(
    resolve(root, 'app/player.tsx'),
    `'use client';

import { useMedia } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { DefaultVideoSkin } from '@/components/videojs/skins/video/skin';

function MediaProbe() {
  const media = useMedia();

  return <output data-testid="media-probe" data-attached={media ? 'true' : 'false'} />;
}

export function Player() {
  return (
    <VideoPlayer>
      <DefaultVideoSkin ${skinProps}>
        <HlsJsVideo aria-label="Validation video" />
        <MediaProbe />
      </DefaultVideoSkin>
    </VideoPlayer>
  );
}
`
  );
}

async function packVideojsPackages(directory: string): Promise<ReadonlyMap<string, string>> {
  await mkdir(directory, { recursive: true });

  const tarballs = new Map<string, string>();

  for (const name of registryPackages) {
    const manifest = JSON.parse(await readFile(resolve(workspaceDir, 'packages', name, 'package.json'), 'utf8'));
    const result = await runCommand(
      'pnpm',
      ['--dir', resolve(workspaceDir, 'packages', name), 'pack', '--pack-destination', directory, '--json'],
      workspaceDir,
      { npm_config_ignore_scripts: 'true' }
    );
    const jsonStart = result.stdout.indexOf('{');
    const packed = JSON.parse(result.stdout.slice(jsonStart));
    const filename = Array.isArray(packed) ? packed[0]?.filename : packed.filename;
    if (!isString(manifest.name) || !isString(filename)) throw new Error(`Could not pack @videojs/${name}.`);

    tarballs.set(manifest.name, `file:${filename}`);
  }

  return tarballs;
}

async function assertPackagePins(items: readonly RegistryItem[]): Promise<void> {
  const versions = new Map<string, string>();

  for (const name of registryPackages) {
    const manifest = JSON.parse(await readFile(resolve(workspaceDir, 'packages', name, 'package.json'), 'utf8'));

    versions.set(manifest.name, manifest.version);
  }

  for (const item of items) {
    for (const dependency of item.dependencies ?? []) {
      if (!dependency.startsWith('@videojs/')) continue;

      const separator = dependency.lastIndexOf('@');
      const name = dependency.slice(0, separator);
      const version = dependency.slice(separator + 1);
      const expected = versions.get(name);

      if (separator <= 0 || !expected || version !== expected) {
        throw new Error(
          `${item.name} must pin ${name || dependency} to its workspace artifact (${expected ?? 'unknown package'}).`
        );
      }
    }
  }
}

async function assertInstalled(root: string, paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    const source = await readFile(resolve(root, path), 'utf8').catch(() => undefined);
    if (!source) throw new Error(`Shadcn did not install ${path}.`);
  }
}

async function add(root: string, names: readonly string[]): Promise<void> {
  await runShadcn(['add', ...names, '--cwd', root, '--yes', '--silent'], root);
}

async function validateRuntime(root: string, styling: string): Promise<void> {
  const port = await availablePort();
  const child = startCommand('pnpm', ['start', '--hostname', '127.0.0.1', '--port', String(port)], root);

  try {
    await waitForServer(`http://127.0.0.1:${port}`);

    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const errors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="media-probe"][data-attached="true"]').waitFor({ state: 'attached' });
      await page.locator('video').waitFor();
      await page.locator('button').first().waitFor();

      const skin = page.locator('.media-skin').first();
      const box = await skin.boundingBox();
      const display = await skin.evaluate((element) => getComputedStyle(element).display);

      if (!box || box.width < 100 || box.height < 50 || display === 'none') {
        throw new Error(`${styling} player did not receive usable skin styles.`);
      }

      if (errors.length > 0) {
        throw new Error(`${styling} runtime emitted browser errors:\n${errors.join('\n')}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    await stopCommand(child);
  }
}

async function validateHtmlRuntime(root: string, styling: string): Promise<void> {
  const port = await availablePort();
  const child = startCommand('pnpm', ['start', '--host', '127.0.0.1', '--port', String(port)], root);

  try {
    await waitForServer(`http://127.0.0.1:${port}`);

    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const errors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
      await page.locator('video-player').waitFor();
      await page.locator('hlsjs-video').waitFor({ state: 'attached' });
      await page.locator('video').waitFor();
      await page.locator('media-play-button[data-paused]').waitFor();

      const skin = page.locator('.media-skin').first();
      const box = await skin.boundingBox();
      const display = await skin.evaluate((element) => getComputedStyle(element).display);
      const definitions = await page.evaluate(() =>
        ['video-player', 'hlsjs-video', 'media-container', 'media-play-button'].every((name) =>
          Boolean(customElements.get(name))
        )
      );
      if (!definitions) throw new Error(`${styling} HTML player did not register its custom elements.`);

      if (!box || box.width < 100 || box.height < 50 || display === 'none') {
        throw new Error(`${styling} HTML player did not receive usable skin styles.`);
      }

      if (errors.length > 0) {
        throw new Error(`${styling} HTML runtime emitted browser errors:\n${errors.join('\n')}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    await stopCommand(child);
  }
}

async function sourceHashes(directory: string): Promise<Array<readonly [string, string]>> {
  const files = await walkFiles(directory);

  return Promise.all(
    files.map(async (filename) => {
      const source = await readFile(filename);

      return [relative(directory, filename), createHash('sha256').update(source).digest('hex')] as const;
    })
  );
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);

      return entry.isDirectory() ? walkFiles(path) : [path];
    })
  );

  return files.flat().sort();
}

async function assertIgnoredOutput(): Promise<void> {
  await Promise.all(
    [sourceDir, hostedDir].map((path) =>
      runCommand('git', ['check-ignore', '--quiet', relative(workspaceDir, path)], workspaceDir)
    )
  );
}

async function runShadcn(
  args: readonly string[],
  cwd: string
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return runCommand(process.execPath, [shadcnBin, ...args], cwd);
}

async function runCommand(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: Readonly<Record<string, string>> = {}
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      executable,
      [...args],
      {
        cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...env,
          CI: '1',
          FORCE_COLOR: '0',
          NEXT_TELEMETRY_DISABLED: '1',
          NO_COLOR: '1',
        },
        maxBuffer: 100 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolvePromise({ stdout, stderr });
          return;
        }

        reject(
          new Error([`${executable} ${args.join(' ')}`, stdout, stderr].filter(Boolean).join('\n'), {
            cause: error,
          })
        );
      }
    );
  });
}

function startCommand(executable: string, args: readonly string[], cwd: string): ChildProcessWithoutNullStreams {
  return spawn(executable, [...args], {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: 'pipe',
  });
}

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(url).catch(() => undefined);
    if (response?.ok) return;

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopCommand(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return;

  child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolvePromise) => child.once('exit', () => resolvePromise())),
    new Promise<void>((resolvePromise) =>
      setTimeout(() => {
        child.kill('SIGKILL');
        resolvePromise();
      }, 5_000)
    ),
  ]);
}

async function availablePort(): Promise<number> {
  const server = createServer();
  const address = await listen(server);
  const port = Number(new URL(address).port);

  await close(server);
  return port;
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || isString(address)) throw new Error('Could not resolve the server address.');

  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
}
