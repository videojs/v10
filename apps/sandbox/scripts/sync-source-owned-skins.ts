/** Install the real hosted registry skins consumed by the Sandbox with the stock Shadcn CLI. */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { isString } from '@videojs/utils/predicate';

const projectDir = resolve(import.meta.dirname, '..');
const workspaceDir = resolve(projectDir, '../..');
const registryDir = resolve(workspaceDir, 'packages/skins/dist/registry/r');
const require = createRequire(import.meta.url);
const shadcnBin = require.resolve('shadcn');
const generatedDir = resolve(projectDir, 'app/_generated');
const presets = ['video', 'audio', 'live-video', 'live-audio'] as const;
const variants = ['', '-minimal'] as const;

const localRegistry = existsSync(resolve(registryDir, 'registry.json'));
const server = localRegistry ? createServer() : undefined;
const address = server
  ? await listen(server)
  : (process.env.VIDEOJS_REGISTRY_URL ?? 'https://shadcn.videojs.org/r').replace(/\/$/, '');

if (server) {
  server.on('request', async (request, response) => {
    const path = new URL(request.url ?? '/', address).pathname.slice(1);
    const source = await readFile(resolve(registryDir, path)).catch(() => undefined);

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
}

await rm(generatedDir, { recursive: true, force: true });

try {
  await installFramework('react', resolve(generatedDir, 'components/videojs'), address);
  await installFramework('html', resolve(generatedDir, 'html/components/videojs'), address);
} finally {
  if (server) await close(server);
}

await runCommand('git', ['check-ignore', '--quiet', 'apps/sandbox/app/_generated'], workspaceDir);

console.log('Installed 8 React and 8 HTML source-owned Sandbox skins from the local hosted registry.');

async function installFramework(framework: 'react' | 'html', destination: string, address: string): Promise<void> {
  const root = await mkdtemp(resolve(tmpdir(), `videojs-sandbox-${framework}-`));

  try {
    await writeFixture(root, address);

    const items = presets.flatMap((preset) =>
      variants.map((variant) => `@videojs/${framework}-${preset}-skin${variant}`)
    );

    await runCommand(
      process.execPath,
      [shadcnBin, 'add', ...items, '--cwd', root, '--yes', '--overwrite', '--silent'],
      root
    );

    await mkdir(destination, { recursive: true });
    await cp(resolve(root, 'src/components/videojs'), destination, { recursive: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeFixture(root: string, address: string): Promise<void> {
  const packageJson = {
    name: 'videojs-sandbox-skins',
    private: true,
    type: 'module',
    packageManager: 'pnpm@11.17.0',
    dependencies: {
      '@videojs/core': '*',
      '@videojs/html': '10.0.0-beta.32',
      '@videojs/react': '10.0.0-beta.32',
      clsx: '*',
      react: '*',
      'tailwind-merge': '*',
    },
  };
  const components = {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'new-york',
    rsc: false,
    tsx: true,
    tailwind: {
      config: '',
      css: 'src/index.css',
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
      '@videojs': `${address}/{name}.json`,
    },
  };
  const tsconfig = {
    compilerOptions: {
      jsx: 'react-jsx',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      noEmit: true,
      paths: { '@/*': ['./src/*'] },
      skipLibCheck: true,
      strict: true,
      target: 'ES2022',
    },
    include: ['src'],
  };

  await mkdir(resolve(root, 'src'), { recursive: true });
  await writeFile(resolve(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(resolve(root, 'components.json'), `${JSON.stringify(components, null, 2)}\n`);
  await writeFile(resolve(root, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`);
  await writeFile(resolve(root, 'src/index.css'), '@import "./components/videojs/styles/tailwind.css";\n');
}

async function runCommand(
  executable: string,
  args: readonly string[],
  cwd: string
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      executable,
      [...args],
      {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
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

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || isString(address)) throw new Error('Could not resolve the registry server address.');

  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
}
