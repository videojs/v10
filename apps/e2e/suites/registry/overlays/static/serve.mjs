// Serves a bundler's `dist/` the way any static host would, so the suite drives the built output rather than a dev server.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const [directory = 'dist', port = '0'] = process.argv.slice(2);
const root = resolve(directory);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1');
  const path = normalize(join(root, pathname.endsWith('/') ? `${pathname}index.html` : pathname));

  if (!path.startsWith(root)) {
    response.statusCode = 400;
    response.end('Invalid path.');
    return;
  }

  try {
    const body = await readFile(path);

    response.setHeader('content-type', types[extname(path)] ?? 'application/octet-stream');
    response.end(body);
  } catch {
    response.statusCode = 404;
    response.end('Not found.');
  }
}).listen(Number(port), '127.0.0.1');
