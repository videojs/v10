import { resolve } from 'node:path';

import { build, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'vite.config.ts');
const reactTarget = '?target=react&skin=default-video&style=vanilla';
const defaultSkinUrl = `/../vjsc/skins/default-video/skin.tsx${reactTarget}`;
const playButtonUrl = `/../vjsc/components/buttons/play-button.tsx${reactTarget}`;
const buttonStyles = resolve(packageDir, 'vjsc/styles/components/button.styles.ts');
const designStyles = resolve(packageDir, 'vjsc/styles/base.css');
const vjscPlayButton = resolve(packageDir, 'vjsc/components/buttons/play-button.tsx');
const reactVirtualSkin = 'virtual:vjsc/skin/react/default-video/vanilla.tsx';
const htmlVirtualSkin = 'virtual:vjsc/skin/html/minimal-video/tailwind.tsx';

describe('Skins Vite workflow', () => {
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
    expect(resolved?.id).toContain('/vjsc/skins/default-video/skin.tsx?skin=default-video&style=vanilla&target=react');
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

  it('serves target and style transforms through stable Vite aliases', async () => {
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
    const targetedPlayButtonId = await server.pluginContainer.resolveId(`${vjscPlayButton}${reactTarget}`);
    const targetedPlayButton = targetedPlayButtonId && server.moduleGraph.getModuleById(targetedPlayButtonId.id);
    expect(targetedPlayButton).toBeDefined();
    expect(targetedPlayButton?.transformResult).not.toBeNull();
    if (!virtualModule || !targetedPlayButton) throw new Error('Expected targeted VJSC modules.');

    const styleInvalidation = {
      skin: virtualModule.lastInvalidationTimestamp,
      component: targetedPlayButton.lastInvalidationTimestamp,
    };
    server.watcher.emit('change', buttonStyles);
    await vi.waitFor(() => {
      expect(virtualModule.lastInvalidationTimestamp).toBeGreaterThan(styleInvalidation.skin);
      expect(targetedPlayButton.lastInvalidationTimestamp).toBeGreaterThan(styleInvalidation.component);
    });

    await server.transformRequest(playButtonUrl);
    expect(targetedPlayButton.transformResult).not.toBeNull();

    const designInvalidation = targetedPlayButton.lastInvalidationTimestamp;
    server.watcher.emit('change', designStyles);
    await vi.waitFor(() => expect(targetedPlayButton.lastInvalidationTimestamp).toBeGreaterThan(designInvalidation));

    await server.transformRequest(playButtonUrl);
    expect(targetedPlayButton.transformResult).not.toBeNull();

    const sourceInvalidation = targetedPlayButton.lastInvalidationTimestamp;
    server.watcher.emit('change', vjscPlayButton);
    await vi.waitFor(() => expect(targetedPlayButton.lastInvalidationTimestamp).toBeGreaterThan(sourceInvalidation));
  }, 30_000);

  it('builds the same VJSC configuration for production', async () => {
    const result = await build({
      configFile,
      logLevel: 'silent',
      build: { write: false },
    });

    expect(result).toBeTruthy();
  }, 30_000);

  it('does not configure Shadcn output while serving', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      server: { middlewareMode: true },
    });

    expect(server.config.plugins.some((plugin) => plugin.name === 'vjsc:shadcn')).toBe(false);
  }, 30_000);
});
