import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { createServer, type OutgoingHttpHeaders, type Server, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { FullConfig } from '@playwright/test';
import { isString } from '@videojs/utils/predicate';

interface PackOutput {
  readonly filename?: string;
}

interface PackageManifest {
  readonly version: string;
}

const run = promisify(execFile);
const suiteDir = resolve(import.meta.dirname, '..');
const generatedDir = resolve(suiteDir, '.generated');
const packageDir = resolve(suiteDir, '../../../../packages/video.js');
const contentTypes = new Map([
  ['.css', 'text/css'],
  ['.js', 'text/javascript'],
]);

/**
 * Serves the packed `video.js` tarball the way npm CDNs serve the `latest` tag, next to the pinned Video.js 8 release.
 * unpkg-style paths redirect unversioned and `@latest` requests to the exact version and `@8` to the newest 8.x;
 * jsDelivr-style paths answer directly; cdnjs-style paths drop `dist/`.
 *
 * The same server renders test pages from `/page?html=…&csp=…`. Tests load pages from `localhost` and CDN files from
 * `127.0.0.1`, so the two stay cross-origin while both stay on loopback; Chromium holds requests from a public origin
 * to a loopback address for a Local Network Access prompt. Tests read both origins from the environment.
 */
export default async function setup(_config: FullConfig): Promise<() => Promise<void>> {
  await rm(generatedDir, { recursive: true, force: true });
  await mkdir(generatedDir, { recursive: true });

  const v10Dir = await unpackVideojs();
  const v8Dir = dirname(createRequire(join(packageDir, 'package.json')).resolve('video.js-8/package.json'));
  const v10 = { dist: join(v10Dir, 'dist'), version: await readVersion(v10Dir) };
  const v8 = { dist: join(v8Dir, 'dist'), version: await readVersion(v8Dir) };

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://cdn');
    const path = url.pathname;
    if (path === '/page') return page(response, url.searchParams);

    if (path === '/init.js') return response.writeHead(200, { 'content-type': 'text/javascript' }).end('__init();');

    const routes: [RegExp, (file: string) => Promise<void> | void][] = [
      [/^\/video\.js(?:@latest)?\/dist\/(.+)$/, (file) => redirect(response, `/video.js@${v10.version}/dist/${file}`)],
      [new RegExp(`^/video\\.js@${escape(v10.version)}/dist/(.+)$`), (file) => send(response, v10.dist, file)],
      [/^\/video\.js@8\/dist\/(.+)$/, (file) => redirect(response, `/video.js@${v8.version}/dist/${file}`)],
      [new RegExp(`^/video\\.js@${escape(v8.version)}/dist/(.+)$`), (file) => send(response, v8.dist, file)],
      [/^\/npm\/video\.js\/dist\/(.+)$/, (file) => send(response, v10.dist, file)],
      [/^\/npm\/video\.js@8\/dist\/(.+)$/, (file) => send(response, v8.dist, file)],
      [/^\/ajax\/libs\/video\.js\/[^/]+\/(.+)$/, (file) => send(response, v10.dist, file)],
    ];

    for (const [pattern, handle] of routes) {
      const file = pattern.exec(path)?.[1];
      if (isString(file)) return handle(file);
    }

    response.writeHead(404).end();
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));

  const address = server.address();
  if (!address || isString(address)) throw new Error('The CDN server has no port.');

  process.env.VIDEOJS_CDN_ORIGIN = `http://127.0.0.1:${address.port}`;
  process.env.VIDEOJS_PAGE_ORIGIN = `http://localhost:${address.port}`;

  return () => close(server);
}

async function unpackVideojs(): Promise<string> {
  const { stdout } = await run(
    'pnpm',
    ['pack', '--config.ignore-scripts=true', '--pack-destination', generatedDir, '--json'],
    { cwd: packageDir }
  );
  // SAFETY: `pnpm pack --json` returns one pack result (or an array containing one result), whose filename is
  // validated before use.
  const output = JSON.parse(stdout) as PackOutput | PackOutput[];
  const filename = Array.isArray(output) ? output[0]?.filename : output.filename;
  if (!isString(filename)) throw new Error('Could not resolve the packed video.js tarball.');

  await run('tar', ['-xzf', resolve(packageDir, filename), '-C', generatedDir]);

  return join(generatedDir, 'package');
}

async function readVersion(dir: string): Promise<string> {
  // SAFETY: both manifests are npm package manifests, which always carry a version.
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as PackageManifest;

  return manifest.version;
}

async function send(response: ServerResponse, dist: string, file: string): Promise<void> {
  try {
    const body = await readFile(join(dist, file));

    response.writeHead(200, cdnHeaders({ 'content-type': contentTypes.get(extname(file)) ?? 'text/plain' })).end(body);
  } catch {
    response.writeHead(404, cdnHeaders()).end();
  }
}

function page(response: ServerResponse, params: URLSearchParams): void {
  const headers: OutgoingHttpHeaders = { 'content-type': 'text/html' };
  const csp = params.get('csp');

  if (csp) headers['content-security-policy'] = csp;

  response.writeHead(200, headers).end(params.get('html') ?? '');
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(302, cdnHeaders({ location })).end();
}

/** Both CDNs allow cross-origin reads, which the redirect's synchronous request relies on. */
function cdnHeaders(headers: OutgoingHttpHeaders = {}): OutgoingHttpHeaders {
  return { 'access-control-allow-origin': '*', 'cache-control': 'no-store', ...headers };
}

function escape(version: string): string {
  return version.replaceAll('.', '\\.');
}

function close(server: Server): Promise<void> {
  return new Promise((done, fail) => server.close((error) => (error ? fail(error) : done())));
}
