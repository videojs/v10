import { resolve } from 'node:path';

import { isString } from '@videojs/utils/predicate';
import { build, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'dev/vite.config.ts');
const reactTarget = '?style=css&target=react&skin=default-video';
const defaultSkinUrl = `/../vjsc/skins/default-video/skin.tsx${reactTarget}`;
const htmlSkinUrl = '/../vjsc/skins/minimal-video/skin.tsx?style=tailwind&target=html&skin=minimal-video';
const htmlContainerUrl = '/../vjsc/components/layout/container.tsx?style=tailwind&target=html&skin=minimal-video';
const playButtonUrl = `/../vjsc/components/buttons/play-button.tsx${reactTarget}`;
const buttonStyles = resolve(packageDir, 'vjsc/styles/components/button.styles.ts');
const designStyles = resolve(packageDir, 'vjsc/styles/base.css');
const vjscPlayButton = resolve(packageDir, 'vjsc/components/buttons/play-button.tsx');

describe('Skins Vite workflow', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 30_000);

  it('resolves queried skin source directly', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      server: { middlewareMode: true },
    });

    await server.environments.client.depsOptimizer?.scanProcessing;
    const resolved = await server.pluginContainer.resolveId(defaultSkinUrl);
    expect(resolved?.id).toContain('/vjsc/skins/default-video/skin.tsx?skin=default-video&style=css&target=react');
  }, 30_000);

  it('transforms the React/css entry and invalidates style owners', async () => {
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

  it('serves target and style transforms through queried source modules', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const reactSkin = await server.transformRequest(defaultSkinUrl);
    const htmlSkin = await server.transformRequest(htmlSkinUrl);
    const htmlContainer = await server.transformRequest(htmlContainerUrl);

    expect(reactSkin?.code).toContain('$RefreshReg$');
    expect(reactSkin?.code).toContain('DefaultVideoSkin');
    expect(htmlSkin?.code).toContain('MinimalVideoSkin');
    expect(htmlSkin?.code).toContain('media-skin-video-minimal');
    expect(htmlContainer?.code).toContain('/src/define/ui/container.ts');
    expect(htmlSkin?.code).not.toContain('@videojs/core/vjsc');
    const resolved = await server.pluginContainer.resolveId(defaultSkinUrl);
    expect(resolved?.id).toContain('/vjsc/skins/default-video/skin.tsx');
    const skinModule = resolved && server.moduleGraph.getModuleById(resolved.id);
    expect(skinModule?.transformResult).not.toBeNull();
    await server.transformRequest(playButtonUrl);
    const targetedPlayButtonId = await server.pluginContainer.resolveId(`${vjscPlayButton}${reactTarget}`);
    const targetedPlayButton = targetedPlayButtonId && server.moduleGraph.getModuleById(targetedPlayButtonId.id);
    expect(targetedPlayButton).toBeDefined();
    expect(targetedPlayButton?.transformResult).not.toBeNull();
    if (!skinModule || !targetedPlayButton) throw new Error('Expected targeted VJSC modules.');

    const styleInvalidation = {
      skin: skinModule.lastInvalidationTimestamp,
      component: targetedPlayButton.lastInvalidationTimestamp,
    };
    server.watcher.emit('change', buttonStyles);
    await vi.waitFor(() => {
      expect(skinModule.lastInvalidationTimestamp).toBeGreaterThan(styleInvalidation.skin);
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

  it('serves optimized icon families with the authored element runtime', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const resolved = await server.pluginContainer.resolveId('@videojs/icons/element/minimal');
    if (!resolved) throw new Error('Expected the source icon plugin to resolve the minimal family.');

    const loaded = await server.pluginContainer.load(resolved.id);
    const source = isString(loaded) ? loaded : loaded?.code;
    const runtime = await server.pluginContainer.resolveId('virtual:videojs/icons/element-runtime');

    expect(source).toContain('aria-hidden');
    expect(source).toContain('virtual:videojs/icons/element-runtime');
    expect(runtime?.id).toBe(resolve(packageDir, '../icons/src/element.ts'));
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
