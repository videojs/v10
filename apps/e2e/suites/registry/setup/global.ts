import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FullConfig } from '@playwright/test';
import { isString } from '@videojs/utils/predicate';

import { registryConsumerProjects, type RegistryConsumerProject } from '../projects.ts';

interface WorkspacePackage {
  readonly directory: string;
  readonly manifest: PackageManifest;
}

interface PackageManifest {
  readonly name?: string;
  readonly version?: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

interface PackOutput {
  readonly filename?: string;
}

const setupDir = dirname(fileURLToPath(import.meta.url));
const suiteDir = resolve(setupDir, '..');
const e2eDir = resolve(suiteDir, '../..');
const workspaceDir = resolve(e2eDir, '../..');
const registryDir = resolve(workspaceDir, 'packages/skins/dist/registry/r');
const generatedDir = resolve(suiteDir, '.generated');
const packagesDir = resolve(generatedDir, 'packages');
const overlaysDir = resolve(suiteDir, 'overlays');
const require = createRequire(import.meta.url);
const shadcnBin = require.resolve('shadcn');
const children: ChildProcess[] = [];

export default async function setup(_config: FullConfig): Promise<() => Promise<void>> {
  await rm(generatedDir, { recursive: true, force: true });
  await mkdir(packagesDir, { recursive: true });

  const started = performance.now();
  const overrides = await packRegistryPackages();
  const registry = createRegistryServer(overrides);

  try {
    const registryUrl = await listen(registry);

    await settle(registryConsumerProjects.map((project) => createConsumer(project, registryUrl, overrides)));
    await settle(registryConsumerProjects.map(verifyConsumer));

    await close(registry);
    await settle(registryConsumerProjects.map(startConsumer));

    console.log(`Prepared ${registryConsumerProjects.length} external registry consumers in ${elapsed(started)}.`);
  } catch (error) {
    await close(registry).catch(() => undefined);
    await cleanup();
    throw error;
  }

  return cleanup;
}

async function createConsumer(
  project: RegistryConsumerProject,
  registryUrl: string,
  overrides: Readonly<Record<string, string>>
): Promise<void> {
  const started = performance.now();
  const projectDir = resolve(generatedDir, project.directory);

  if (project.framework === 'react') await scaffoldNext(project);
  else await scaffoldVite(project);

  if (project.framework === 'html') await configureViteTypes(projectDir);

  await configurePackage(project, projectDir, overrides);
  await configureShadcn(project, projectDir, registryUrl);
  await exerciseRegistryCli(project, projectDir);
  await applyOverlay(project, projectDir);

  console.log(`Installed ${project.name} in ${elapsed(started)}.`);
}

async function scaffoldNext(project: RegistryConsumerProject): Promise<void> {
  await run(
    'pnpm',
    [
      'dlx',
      'create-next-app@16.3.3',
      project.directory,
      '--ts',
      '--eslint',
      '--app',
      '--src-dir',
      project.styling === 'tailwind' ? '--tailwind' : '--no-tailwind',
      '--no-react-compiler',
      '--empty',
      '--use-pnpm',
      '--skip-install',
      '--yes',
      '--disable-git',
      '--import-alias',
      '@/*',
    ],
    generatedDir
  );
}

async function scaffoldVite(project: RegistryConsumerProject): Promise<void> {
  await run(
    'pnpm',
    ['dlx', 'create-vite@8.2.0', project.directory, '--template', 'vanilla-ts', '--no-interactive'],
    generatedDir
  );
}

async function configurePackage(
  project: RegistryConsumerProject,
  projectDir: string,
  overrides: Readonly<Record<string, string>>
): Promise<void> {
  const path = resolve(projectDir, 'package.json');
  // SAFETY: the official scaffolds produce a package.json object; the fields read below are optional and object-spread
  // preserves the rest of that document.
  const manifest = JSON.parse(await readFile(path, 'utf8')) as PackageManifest;
  const devDependencies = { ...manifest.devDependencies };

  if (project.framework === 'html' && project.styling === 'tailwind') {
    devDependencies['@tailwindcss/vite'] = '4.3.3';
    devDependencies.tailwindcss = '4.3.3';
  }

  await writeFile(
    path,
    `${JSON.stringify(
      {
        ...manifest,
        private: true,
        packageManager: 'pnpm@11.17.0',
        devDependencies,
      },
      null,
      2
    )}\n`
  );

  const workspace = [
    'packages:',
    "  - '.'",
    'overrides:',
    ...Object.entries(overrides).map(([name, value]) => `  '${name}': '${value}'`),
    'allowBuilds:',
    "  'esbuild@0.28.2': true",
    "  'unrs-resolver@1.12.2': true",
    '',
  ].join('\n');

  await writeFile(resolve(projectDir, 'pnpm-workspace.yaml'), workspace);
}

async function configureShadcn(
  project: RegistryConsumerProject,
  projectDir: string,
  registryUrl: string
): Promise<void> {
  const sourceDir = resolve(projectDir, 'src');
  const css = project.framework === 'react' ? 'src/app/globals.css' : 'src/style.css';
  const registryPath = [project.framework, project.styling === 'css' ? 'css' : undefined].filter(Boolean).join('/');

  await mkdir(resolve(sourceDir, 'lib'), { recursive: true });
  await writeFile(
    resolve(projectDir, 'components.json'),
    `${JSON.stringify(
      {
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'new-york',
        rsc: project.framework === 'react',
        tsx: true,
        tailwind: {
          config: '',
          css,
          baseColor: 'neutral',
          cssVariables: true,
          prefix: '',
        },
        aliases: {
          components: '@/components',
          ui: '@/components/ui',
          utils: '@/lib/utils',
          lib: '@/lib',
          hooks: '@/hooks',
        },
        registries: {
          '@videojs': `${registryUrl}/${registryPath}/{name}.json`,
        },
      },
      null,
      2
    )}\n`
  );
}

async function exerciseRegistryCli(project: RegistryConsumerProject, projectDir: string): Promise<void> {
  const search = await shadcn(['search', '@videojs', '--query', 'video', '--json', '--cwd', projectDir], projectDir);
  if (!search.stdout.includes('video')) throw new Error(`${project.name} could not find the Video Skin.`);

  const view = await shadcn(['view', `@videojs/${project.skin}`, '--cwd', projectDir], projectDir);
  if (!view.stdout.includes(project.skin)) throw new Error(`${project.name} could not view ${project.skin}.`);

  await shadcn(['add', `@videojs/${project.skin}`, '--yes', '--silent', '--cwd', projectDir], projectDir);

  const skinDir = project.skin === 'video' ? 'skins/video' : 'skins/video/minimal';
  const extension = project.framework === 'react' ? 'tsx' : 'html';

  await readFile(resolve(projectDir, `src/components/videojs/${skinDir}/skin.${extension}`), 'utf8');

  const installedFiles = await readdir(resolve(projectDir, 'src/components/videojs'), { recursive: true });

  if (installedFiles.some((path) => /-(?:tailwind|css)\.[^.]+$/.test(path))) {
    throw new Error(`${project.name} installed a styling-specific module path.`);
  }
}

async function applyOverlay(project: RegistryConsumerProject, projectDir: string): Promise<void> {
  if (project.framework === 'react') {
    const appDir = resolve(projectDir, 'src/app');
    const player = project.skin === 'video' ? 'player.tsx' : 'minimal-player.tsx';

    await cp(resolve(overlaysDir, 'next', player), resolve(appDir, 'player.tsx'));
    await cp(resolve(overlaysDir, 'next/page.tsx'), resolve(appDir, 'page.tsx'));
    return;
  }

  const sourceDir = resolve(projectDir, 'src');
  const main = project.skin === 'video' ? 'main.ts' : 'minimal-main.ts';
  const style = project.styling === 'tailwind' ? 'tailwind.css' : 'style.css';
  const viteConfig = project.styling === 'tailwind' ? 'tailwind.vite.config.ts' : 'vite.config.ts';

  await cp(resolve(overlaysDir, 'vite', main), resolve(sourceDir, 'main.ts'));
  await cp(resolve(overlaysDir, 'vite', style), resolve(sourceDir, 'style.css'));
  await cp(resolve(overlaysDir, 'vite', viteConfig), resolve(projectDir, 'vite.config.ts'));
}

async function configureViteTypes(projectDir: string): Promise<void> {
  const path = resolve(projectDir, 'tsconfig.json');
  const config = {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      types: ['vite/client'],
      skipLibCheck: true,
      moduleResolution: 'Bundler',
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      moduleDetection: 'force',
      noEmit: true,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      erasableSyntaxOnly: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedSideEffectImports: true,
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
  };

  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
}

async function verifyConsumer(project: RegistryConsumerProject): Promise<void> {
  const started = performance.now();
  const projectDir = resolve(generatedDir, project.directory);

  if (project.framework === 'react') {
    await run('pnpm', ['--ignore-workspace', 'run', 'lint'], projectDir);
  }

  await run('pnpm', ['--ignore-workspace', 'run', 'build'], projectDir);

  if (project.framework === 'react') {
    await run('pnpm', ['--ignore-workspace', 'exec', 'tsc', '--noEmit'], projectDir);
  }

  console.log(`Verified ${project.name} in ${elapsed(started)}.`);
}

async function startConsumer(project: RegistryConsumerProject): Promise<void> {
  const projectDir = resolve(generatedDir, project.directory);
  const args =
    project.framework === 'react'
      ? ['--ignore-workspace', 'run', 'start', '--hostname', '127.0.0.1', '--port', String(project.port)]
      : [
          '--ignore-workspace',
          'exec',
          'vite',
          'preview',
          '--host',
          '127.0.0.1',
          '--port',
          String(project.port),
          '--strictPort',
        ];
  const child = spawn('pnpm', args, {
    cwd: projectDir,
    detached: true,
    env: consumerEnvironment(),
    stdio: 'ignore',
  });

  children.push(child);
  await waitForUrl(`http://127.0.0.1:${project.port}`);
}

async function packRegistryPackages(): Promise<Readonly<Record<string, string>>> {
  const workspacePackages = await readWorkspacePackages();
  const roots = await registryPackageRoots();
  const required = packageClosure(roots, workspacePackages);
  const overrides: Record<string, string> = {};

  await Promise.all(
    [...required].sort().map(async (name) => {
      const workspacePackage = workspacePackages.get(name);
      if (!workspacePackage) throw new Error(`Could not pack missing workspace dependency ${name}.`);

      const result = await run(
        'pnpm',
        ['pack', '--config.ignore-scripts=true', '--pack-destination', packagesDir, '--json'],
        workspacePackage.directory
      );
      // SAFETY: `pnpm pack --json` returns one pack result (or an array containing one result), whose filename is
      // validated before use.
      const output = JSON.parse(result.stdout) as PackOutput | PackOutput[];
      const filename = Array.isArray(output) ? output[0]?.filename : output.filename;
      if (!isString(filename)) throw new Error(`Could not resolve the packed artifact for ${name}.`);

      overrides[name] = `file:${resolve(workspacePackage.directory, filename)}`;
    })
  );

  return overrides;
}

async function registryPackageRoots(): Promise<Set<string>> {
  const roots = new Set<string>();

  for (const project of registryConsumerProjects) {
    const directory = [project.framework, project.styling === 'css' ? 'css' : undefined].filter(Boolean).join('/');
    const item = JSON.parse(await readFile(resolve(registryDir, directory, `${project.skin}.json`), 'utf8'));

    for (const dependency of item.dependencies ?? []) {
      const match = /^(@videojs\/[^@]+)@/.exec(dependency);

      if (match?.[1]) roots.add(match[1]);
    }
  }

  return roots;
}

async function readWorkspacePackages(): Promise<Map<string, WorkspacePackage>> {
  const packages = new Map<string, WorkspacePackage>();
  const directory = resolve(workspaceDir, 'packages');

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const packageDir = resolve(directory, entry.name);
    const source = await readFile(resolve(packageDir, 'package.json'), 'utf8').catch(() => undefined);
    if (!source) continue;

    // SAFETY: each source is a workspace package.json; `name` is checked before the manifest enters the package map.
    const manifest = JSON.parse(source) as PackageManifest;

    if (manifest.name?.startsWith('@videojs/')) packages.set(manifest.name, { directory: packageDir, manifest });
  }

  return packages;
}

function packageClosure(roots: ReadonlySet<string>, packages: ReadonlyMap<string, WorkspacePackage>): Set<string> {
  const required = new Set<string>();
  const pending = [...roots];

  while (pending.length > 0) {
    const name = pending.pop();
    if (!name || required.has(name)) continue;

    const workspacePackage = packages.get(name);
    if (!workspacePackage) throw new Error(`Registry requires unknown workspace package ${name}.`);

    required.add(name);

    for (const dependencies of [
      workspacePackage.manifest.dependencies,
      workspacePackage.manifest.optionalDependencies,
    ]) {
      for (const dependency of Object.keys(dependencies ?? {})) {
        if (packages.has(dependency) && !required.has(dependency)) pending.push(dependency);
      }
    }
  }

  return required;
}

function createRegistryServer(overrides: Readonly<Record<string, string>>): Server {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const path = resolve(registryDir, `.${pathname}`);

    if (!path.startsWith(`${registryDir}/`)) {
      response.statusCode = 400;
      response.end('Invalid registry path.');
      return;
    }

    const source = await readFile(path, 'utf8').catch(() => undefined);

    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('cache-control', 'no-store');

    if (!source) {
      response.statusCode = 404;
      response.end('Not found.');
      return;
    }

    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(withLocalPackages(source, overrides));
  });
}

function withLocalPackages(source: string, overrides: Readonly<Record<string, string>>): string {
  // SAFETY: hosted registry files have already passed Shadcn schema validation. This local server only replaces exact
  // package pins with their packed workspace artifacts before the stock CLI consumes the document.
  const document = JSON.parse(source) as { dependencies?: string[] };
  if (!document.dependencies) return source;

  document.dependencies = document.dependencies.map((dependency) => {
    const match = /^(@videojs\/[^@]+)@/.exec(dependency);
    const local = match?.[1] ? overrides[match[1]] : undefined;

    return local ?? dependency;
  });

  return `${JSON.stringify(document)}\n`;
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || isString(address)) throw new Error('Could not resolve the local registry address.');

  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return;

  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
}

async function shadcn(args: readonly string[], cwd: string) {
  return run(process.execPath, [shadcnBin, ...args], cwd);
}

async function run(executable: string, args: readonly string[], cwd = workspaceDir) {
  return new Promise<{ readonly stdout: string; readonly stderr: string }>((resolvePromise, reject) => {
    execFile(
      executable,
      [...args],
      {
        cwd,
        encoding: 'utf8',
        env: consumerEnvironment(),
        maxBuffer: 100 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolvePromise({ stdout, stderr });
          return;
        }

        reject(
          new Error([`${executable} ${args.join(' ')}`, stdout, stderr].filter(Boolean).join('\n'), { cause: error })
        );
      }
    );
  });
}

function consumerEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CI: '1',
    FORCE_COLOR: '0',
    NEXT_TELEMETRY_DISABLED: '1',
    NO_COLOR: '1',
    npm_config_ignore_workspace: 'true',
  };
}

async function waitForUrl(url: string): Promise<void> {
  const timeout = Date.now() + 120_000;

  while (Date.now() < timeout) {
    const response = await fetch(url).catch(() => undefined);
    if (response?.ok) return;

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function cleanup(): Promise<void> {
  for (const child of children.splice(0)) {
    if (!child.pid || child.exitCode !== null) continue;

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }

  if (!process.env.VIDEOJS_KEEP_REGISTRY_FIXTURES) {
    await rm(generatedDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

async function settle(tasks: Iterable<Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(tasks);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

function elapsed(started: number): string {
  return `${((performance.now() - started) / 1000).toFixed(1)}s`;
}
