import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build, createLogger, createServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vite-plus/test';

import { vjscPlugin } from '..';

describe('vjscPlugin style diagnostics', () => {
  let root: string;
  let entry: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'vjsc-vite-diagnostics-'));
    entry = join(root, 'component.ts');

    await writeFile(
      join(root, 'component.styles.ts'),
      `
        import { styles } from 'vjsc/styles';

        export default styles({
          file: 'component.css',
          layer: 'fixture.components',
          rules: {
            root: {
              className: 'fixture-root',
              utilities: '[&_img]:block',
            },
          },
        });
      `
    );
    await writeFile(entry, `import styles from './component.styles'; export const className = styles.root;`);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports diagnostics while serving and skips them during production builds', async () => {
    const logger = createLogger('silent');
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const warnOnce = vi.spyOn(logger, 'warnOnce').mockImplementation(() => {});
    const server = await createServer({
      configFile: false,
      customLogger: logger,
      logLevel: 'silent',
      root,
      optimizeDeps: { include: [], noDiscovery: true },
      plugins: vjscPlugin({ configure }),
      server: { middlewareMode: true },
    });

    try {
      await server.transformRequest('/component.ts');
    } finally {
      await server.close();
    }

    expect(warnings(warn, warnOnce)).toContain('[VJSC_STYLE_COMPLEX_SELECTOR]');

    warn.mockClear();
    warnOnce.mockClear();

    await build({
      configFile: false,
      customLogger: logger,
      logLevel: 'silent',
      plugins: vjscPlugin({ configure }),
      build: {
        write: false,
        rolldownOptions: { input: entry },
      },
    });

    expect(warnings(warn, warnOnce)).toBe('');
  });
});

function configure() {
  return { targets: [], styles: { mode: 'tailwind' as const } };
}

function warnings(warn: ReturnType<typeof vi.spyOn>, warnOnce: ReturnType<typeof vi.spyOn>): string {
  return [...warn.mock.calls, ...warnOnce.mock.calls].flat().join('\n');
}
