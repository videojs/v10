import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import sirv from 'sirv';

export interface PagefindOptions {
  /**
   * The path to the built site to index.
   * Defaults to the Astro output directory.
   */
  site?: string;
}

export default function pagefind(options: PagefindOptions = {}): AstroIntegration {
  return {
    name: 'pagefind',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        // Serve Pagefind index from previous build during development
        const rootDir = server.config.root;
        const indexDir = join(rootDir, 'dist', 'client');
        const pagefindDir = join(indexDir, 'pagefind');

        // Warn if index doesn't exist yet
        if (!existsSync(pagefindDir)) {
          logger.warn(
            'Pagefind index not found. Run `pnpm build` first to generate ' + 'the search index for development mode.'
          );
        } else {
          logger.debug(`Serving Pagefind index from ${indexDir}`);
        }

        // Create sirv middleware to serve static files
        // approach adapted from https://github.com/shishkin/astro-pagefind
        const serve = sirv(indexDir, {
          dev: true, // No caching in dev mode
          etag: true, // Enable cache validation
        });

        // Mount middleware for /pagefind/* routes only
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/pagefind/')) {
            serve(req, res, next);
          } else {
            next();
          }
        });
      },

      'astro:build:done': async ({ dir, logger }) => {
        // Determine the site directory to index
        // The dir parameter already points to the correct static output directory
        const siteDir = options.site || fileURLToPath(dir);

        // Map Astro logger levels to Pagefind CLI flags
        const logLevel = logger.options.level;
        const logFlags: string[] = [];

        if (logLevel === 'silent' || logLevel === 'error') {
          logFlags.push('--silent');
        } else if (logLevel === 'warn') {
          logFlags.push('--quiet');
        } else if (logLevel === 'debug') {
          logFlags.push('--verbose');
        }
        // 'info' level uses no flag (default)

        logger.info('Running Pagefind indexer...');

        return new Promise<void>((resolve, reject) => {
          const pagefindProcess = spawn('npx', ['-y', 'pagefind', ...logFlags, '--site', siteDir], {
            stdio: 'inherit',
            shell: true,
          });

          pagefindProcess.on('close', (code) => {
            if (code === 0) {
              logger.info('Pagefind indexing complete');
              resolve();
            } else {
              reject(new Error(`Pagefind process exited with code ${code}`));
            }
          });

          pagefindProcess.on('error', (error) => {
            reject(new Error(`Failed to start Pagefind: ${error.message}`));
          });
        });
      },
    },
  };
}
