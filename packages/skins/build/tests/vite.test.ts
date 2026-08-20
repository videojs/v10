import { resolve } from 'node:path';

import { build, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'vite.config.ts');
const defaultSkinUrl = '/../canonical/skins/default-video/skin.tsx';
const playButtonUrl = '/../canonical/components/buttons/play-button.tsx';
const buttonStyles = resolve(packageDir, 'canonical/styles/components/button.styles.ts');
const corePlayButton = resolve(packageDir, '../core/src/core/ui/play-button/play-button-component.ts');
const reactVirtualSkin = 'virtual:vjsc/skin/react/default-video/vanilla.tsx';
const htmlVirtualSkin = 'virtual:vjsc/skin/html/minimal-video/tailwind.tsx';
const virtualCatalog = 'virtual:vjsc/catalog';

describe('canonical Skins Vite workflow', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 30_000);

  it('scans the development entry without resolving virtual modules as files', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      server: { middlewareMode: true },
    });

    await server.environments.client.depsOptimizer?.scanProcessing;
    const resolved = await server.pluginContainer.resolveId(reactVirtualSkin);
    expect(resolved?.id).toBe(reactVirtualSkin);
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
  }, 30_000);

  it('serves framework and style projections through stable virtual modules', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const reactSkin = await server.transformRequest(reactVirtualSkin);
    const htmlSkin = await server.transformRequest(htmlVirtualSkin);
    const catalog = await server.transformRequest(virtualCatalog);

    expect(reactSkin?.code).toContain('$RefreshReg$');
    expect(reactSkin?.code).toContain('DefaultVideoSkin');
    expect(htmlSkin?.code).toContain('const skin =');
    expect(htmlSkin?.code).toContain('media-skin-video-minimal');
    expect(htmlSkin?.code).not.toContain('@videojs/core/vjsc');
    expect(catalog?.code).toContain('default-video');
    expect(catalog?.code).toContain('play-button');

    const resolved = await server.pluginContainer.resolveId(reactVirtualSkin);
    expect(resolved?.id).toBe(reactVirtualSkin);
    const virtualModule = resolved && server.moduleGraph.getModuleById(resolved.id);
    expect(virtualModule?.transformResult).not.toBeNull();

    server.watcher.emit('change', buttonStyles);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(virtualModule?.transformResult).toBeNull();

    await server.transformRequest(reactVirtualSkin);
    expect(virtualModule?.transformResult).not.toBeNull();

    server.watcher.emit('change', corePlayButton);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(virtualModule?.transformResult).toBeNull();
  }, 30_000);

  it('builds the same canonical configuration for production', async () => {
    const result = await build({
      configFile,
      logLevel: 'silent',
      build: { write: false },
    });

    expect(result).toBeTruthy();
  }, 30_000);
});
