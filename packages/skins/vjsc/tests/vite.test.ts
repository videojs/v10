import { resolve } from 'node:path';

import { build, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'vite.config.ts');
const reactProjection = '?framework=react&skin=default-video&style=vanilla';
const defaultSkinUrl = `/../vjsc/skins/default-video/skin.tsx${reactProjection}`;
const playButtonUrl = `/../vjsc/components/buttons/play-button.tsx${reactProjection}`;
const buttonStyles = resolve(packageDir, 'vjsc/styles/components/button.styles.ts');
const vjscPlayButton = resolve(packageDir, 'vjsc/components/buttons/play-button.tsx');
const corePlayButton = resolve(packageDir, '../core/src/core/ui/play-button/play-button-component.ts');
const reactVirtualSkin = 'virtual:vjsc/skin/react/default-video/vanilla.tsx';
const htmlVirtualSkin = 'virtual:vjsc/skin/html/minimal-video/tailwind.tsx';

describe('VJSC Skins Vite workflow', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 30_000);

  it('maps preview entry aliases to real VJSC source', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      server: { middlewareMode: true },
    });

    await server.environments.client.depsOptimizer?.scanProcessing;
    const resolved = await server.pluginContainer.resolveId(reactVirtualSkin);
    expect(resolved?.id).toContain(
      '/vjsc/skins/default-video/skin.tsx?framework=react&skin=default-video&style=vanilla'
    );
  }, 30_000);

  it('transforms the React/vanilla entry and invalidates style owners', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const skin = await server.transformRequest(defaultSkinUrl);
    expect(skin?.code).toContain('$RefreshReg$');
    expect(skin?.code).toContain('virtual:vjsc/css');
    expect(skin?.code).not.toContain('vjsc/dist/components/jsx-dev-runtime');
    expect(skin?.code).not.toContain('@videojs/core/vjsc');

    await server.transformRequest(playButtonUrl);
    const owner = await server.moduleGraph.getModuleByUrl(playButtonUrl);
    expect(owner?.transformResult).not.toBeNull();

    server.watcher.emit('change', buttonStyles);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owner?.transformResult).toBeNull();
  }, 30_000);

  it('serves framework and style transforms through stable Vite aliases', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const reactSkin = await server.transformRequest(reactVirtualSkin);
    const htmlSkin = await server.transformRequest(htmlVirtualSkin);

    expect(reactSkin?.code).toContain('$RefreshReg$');
    expect(reactSkin?.code).toContain('DefaultVideoSkin');
    expect(htmlSkin?.code).toContain('MinimalVideoSkin');
    expect(htmlSkin?.code).toContain('media-skin-video-minimal');
    expect(htmlSkin?.code).not.toContain('@videojs/core/vjsc');
    const resolved = await server.pluginContainer.resolveId(reactVirtualSkin);
    expect(resolved?.id).toContain('/vjsc/skins/default-video/skin.tsx');
    const virtualModule = resolved && server.moduleGraph.getModuleById(resolved.id);
    expect(virtualModule?.transformResult).not.toBeNull();
    await server.transformRequest(playButtonUrl);
    const projectedPlayButtonId = await server.pluginContainer.resolveId(`${vjscPlayButton}${reactProjection}`);
    const projectedPlayButton = projectedPlayButtonId && server.moduleGraph.getModuleById(projectedPlayButtonId.id);
    expect(projectedPlayButton).toBeDefined();
    expect(projectedPlayButton?.transformResult).not.toBeNull();

    server.watcher.emit('change', buttonStyles);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(virtualModule?.transformResult).toBeNull();
    expect(projectedPlayButton?.transformResult).toBeNull();

    await server.transformRequest(playButtonUrl);
    expect(projectedPlayButton?.transformResult).not.toBeNull();

    server.watcher.emit('change', corePlayButton);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(projectedPlayButton?.transformResult).toBeNull();

    await server.transformRequest(playButtonUrl);
    expect(projectedPlayButton?.transformResult).not.toBeNull();

    server.watcher.emit('change', vjscPlayButton);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(projectedPlayButton?.transformResult).toBeNull();
  }, 30_000);

  it('builds the same VJSC configuration for production', async () => {
    const result = await build({
      configFile,
      logLevel: 'silent',
      build: { write: false },
    });

    expect(result).toBeTruthy();
  }, 30_000);
});
