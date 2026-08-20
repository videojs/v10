import { resolve } from 'node:path';

import { build, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'vite.config.ts');
const defaultSkinUrl = '/../canonical/skins/default-video/skin.tsx';
const playButtonUrl = '/../canonical/components/buttons/play-button.tsx';
const buttonStyles = resolve(packageDir, 'canonical/styles/components/button.styles.ts');

describe('canonical Skins Vite workflow', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 30_000);

  it('transforms the canonical React/vanilla entry and invalidates style owners', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const skin = await server.transformRequest(defaultSkinUrl);
    expect(skin?.code).toContain('$RefreshReg$');
    expect(skin?.code).toContain('virtual:vjsc/css');
    expect(skin?.code).not.toContain('compiler/dist/components/jsx-dev-runtime');
    expect(skin?.code).not.toContain('@videojs/core/vjsc');

    await server.transformRequest(playButtonUrl);
    const owner = await server.moduleGraph.getModuleByUrl(playButtonUrl);
    expect(owner?.transformResult).not.toBeNull();

    server.watcher.emit('change', buttonStyles);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owner?.transformResult).toBeNull();
  });

  it('builds the same canonical configuration for production', async () => {
    const result = await build({
      configFile,
      logLevel: 'silent',
      build: { write: false },
    });

    expect(result).toBeTruthy();
  });
});
