import { resolve } from 'node:path';

import { build, createLogger, createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'dev/vite.config.ts');
const reactTarget = '?style=css&target=react&skin=default-video';
const defaultSkinUrl = `/../vjsc/skins/default-video/skin.tsx${reactTarget}`;
const defaultControlsUrl = `/../vjsc/skins/default-video/controls.tsx${reactTarget}`;
const htmlContainerUrl = '/../vjsc/components/layout/container.tsx?style=tailwind&target=html&skin=minimal-video';
const playButtonUrl = `/../vjsc/components/buttons/play-button.tsx${reactTarget}`;
const settingsMenuUrl = `/../vjsc/components/menus/settings-menu.tsx${reactTarget}`;
const volumePopoverUrl = `/../vjsc/components/controls/volume-popover.tsx${reactTarget}`;
const htmlPosterUrl = '/../vjsc/components/layout/poster.tsx?style=tailwind&target=html&skin=default-video';
const reactPosterUrl = '/../vjsc/components/layout/poster.tsx?style=tailwind&target=react&skin=default-video';
const buttonStyles = resolve(packageDir, 'vjsc/styles/buttons/button.styles.ts');
const controlsStyles = resolve(packageDir, 'vjsc/skins/default-video/controls.styles.ts');
const designStyles = resolve(packageDir, 'vjsc/styles/base.css');
const skinConfig = resolve(packageDir, 'vjsc/config.ts');
const vjscPlayButton = resolve(packageDir, 'vjsc/components/buttons/play-button.tsx');
const frameworks = ['react', 'html'] as const;
const skins = ['default-video', 'minimal-video'] as const;
const styles = ['css', 'tailwind'] as const;
const variants = frameworks.flatMap((framework) =>
  skins.flatMap((skin) => styles.map((style) => ({ framework, skin, style })))
);

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

  it('serves every framework, Skin, and style combination', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    for (const variant of variants) {
      const url = skinUrl(variant);
      const result = await server.transformRequest(url);
      const skinExport = variant.skin === 'default-video' ? 'DefaultVideoSkin' : 'MinimalVideoSkin';
      const skinClass = variant.skin === 'default-video' ? 'media-skin-video' : 'media-skin-video-minimal';

      expect(result?.code, url).toContain(skinExport);
      expect(result?.code, url).toContain(skinClass);
      expect(result?.code, url).not.toContain('vjsc/dist/components/jsx-dev-runtime');
      expect(result?.code, url).not.toContain('@videojs/core/vjsc');

      if (variant.framework === 'react') expect(result?.code, url).toContain('$RefreshReg$');

      const controls = await server.transformRequest(controlsUrl(variant));

      if (variant.style === 'css') {
        const code = controls?.code ?? '';

        expect(code, url).toContain('virtual:vjsc/css');
        expect(code, url).toContain('/base.css');
        expect(code.indexOf('/base.css'), url).toBeLessThan(code.indexOf('/controls.css'));
      } else expect(controls?.code, url).not.toContain('virtual:vjsc/css');
    }

    const htmlContainer = await server.transformRequest(htmlContainerUrl);

    expect(htmlContainer?.code).toContain('/src/define/ui/container.ts');
  }, 30_000);

  it('reports VJSC style diagnostics through the Vite logger', async () => {
    const logger = createLogger('warn');
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const warnOnce = vi.spyOn(logger, 'warnOnce').mockImplementation(() => {});

    server = await createServer({
      configFile,
      customLogger: logger,
      logLevel: 'warn',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    await server.transformRequest(reactPosterUrl);
    const warnings = [...warn.mock.calls, ...warnOnce.mock.calls].flat().join('\n');

    expect(warnings).toContain('[VJSC_STYLE_COMPLEX_SELECTOR]');
    expect(warnings).toContain('Reason:');
    expect(warnings).toContain('Recommendation:');
  }, 30_000);

  it('passes trigger props to the concrete React render element', async () => {
    const logger = createLogger('silent');
    const warn = vi.spyOn(logger, 'warn');
    const warnOnce = vi.spyOn(logger, 'warnOnce');

    server = await createServer({
      configFile,
      customLogger: logger,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const settingsMenu = await server.transformRequest(settingsMenuUrl);
    const volumePopover = await server.transformRequest(volumePopoverUrl);

    expect(settingsMenu?.code).toContain('Tooltip.Trigger, { render: /* @__PURE__ */ _jsxDEV(Menu.Trigger');
    expect(volumePopover?.code).toContain(
      'VolumePopoverPrimitive.Trigger, { render: /* @__PURE__ */ _jsxDEV(MuteButton'
    );
    expect([...warn.mock.calls, ...warnOnce.mock.calls].flat().join('\n')).not.toContain('emitFile() is not supported');
  }, 30_000);

  it('includes Shadow DOM utilities only for HTML targets', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    const html = await server.transformRequest(htmlPosterUrl);
    const react = await server.transformRequest(reactPosterUrl);

    expect(html?.code).toContain('[&_::slotted(img)]:absolute');
    expect(react?.code).not.toContain('::slotted');
  }, 30_000);

  it('invalidates transformed owners for component, style, and design changes', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    await server.transformRequest(defaultSkinUrl);
    const resolved = await server.pluginContainer.resolveId(defaultSkinUrl);

    expect(resolved?.id).toContain('/vjsc/skins/default-video/skin.tsx');
    const skinModule = resolved && server.moduleGraph.getModuleById(resolved.id);

    expect(skinModule?.transformResult).not.toBeNull();
    await server.transformRequest(defaultControlsUrl);
    const targetedControlsId = await server.pluginContainer.resolveId(defaultControlsUrl);
    const targetedControls = targetedControlsId && server.moduleGraph.getModuleById(targetedControlsId.id);

    expect(targetedControls?.transformResult).not.toBeNull();
    await server.transformRequest(playButtonUrl);
    const targetedPlayButtonId = await server.pluginContainer.resolveId(`${vjscPlayButton}${reactTarget}`);
    const targetedPlayButton = targetedPlayButtonId && server.moduleGraph.getModuleById(targetedPlayButtonId.id);

    expect(targetedPlayButton).toBeDefined();
    expect(targetedPlayButton?.transformResult).not.toBeNull();

    if (!skinModule || !targetedControls || !targetedPlayButton) throw new Error('Expected targeted VJSC modules.');

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

    const controlsInvalidation = {
      skin: skinModule.lastInvalidationTimestamp,
      controls: targetedControls.lastInvalidationTimestamp,
    };

    server.watcher.emit('change', controlsStyles);
    await vi.waitFor(() => {
      expect(skinModule.lastInvalidationTimestamp).toBeGreaterThan(controlsInvalidation.skin);
      expect(targetedControls.lastInvalidationTimestamp).toBeGreaterThan(controlsInvalidation.controls);
    });

    const designInvalidation = targetedPlayButton.lastInvalidationTimestamp;

    server.watcher.emit('change', designStyles);
    await vi.waitFor(() => expect(targetedPlayButton.lastInvalidationTimestamp).toBeGreaterThan(designInvalidation));

    await server.transformRequest(playButtonUrl);
    expect(targetedPlayButton.transformResult).not.toBeNull();

    const sourceInvalidation = targetedPlayButton.lastInvalidationTimestamp;

    server.watcher.emit('change', vjscPlayButton);
    await vi.waitFor(() => expect(targetedPlayButton.lastInvalidationTimestamp).toBeGreaterThan(sourceInvalidation));
  }, 30_000);

  it('restarts when compiler configuration changes', async () => {
    server = await createServer({
      configFile,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      server: { middlewareMode: true },
    });

    expect(server.config.configFileDependencies).toContain(skinConfig);
    const restart = vi.spyOn(server, 'restart').mockResolvedValue();

    server.watcher.emit('change', skinConfig);
    await vi.waitFor(() => expect(restart).toHaveBeenCalledOnce());
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
    const source = typeof loaded === 'string' ? loaded : loaded?.code;
    const runtime = resolve(packageDir, '../icons/src/element.ts');
    const transformed = await server.transformRequest(resolved.id);

    expect(source).toContain('aria-hidden');
    expect(source).toContain(runtime);
    expect(transformed?.code).toContain('/@fs/');
    expect(transformed?.code).toContain('MediaIconElement');
    expect(await server.pluginContainer.resolveId(runtime, resolved.id)).toMatchObject({ id: runtime });
  }, 30_000);

  it('builds the same VJSC configuration for production', async () => {
    const result = await build({
      configFile,
      logLevel: 'silent',
      build: { write: false },
    });

    const output = (Array.isArray(result) ? result : [result]).flatMap((build) =>
      'output' in build ? build.output : []
    );
    const chunks = output.filter((item) => item.type === 'chunk');
    const facades = chunks.flatMap((chunk) => (chunk.facadeModuleId ? [chunk.facadeModuleId] : []));

    for (const variant of variants) {
      const expected = `skin.tsx?skin=${variant.skin}&style=${variant.style}&target=${variant.framework}`;

      expect(
        facades.some((id) => id.endsWith(expected)),
        expected
      ).toBe(true);
    }

    expect(output.some((item) => item.type === 'asset' && item.fileName.endsWith('.js.map'))).toBe(true);
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

function skinUrl(variant: (typeof variants)[number]): string {
  return `/../vjsc/skins/${variant.skin}/skin.tsx?style=${variant.style}&target=${variant.framework}&skin=${variant.skin}`;
}

function controlsUrl(variant: (typeof variants)[number]): string {
  return `/../vjsc/skins/${variant.skin}/controls.tsx?style=${variant.style}&target=${variant.framework}&skin=${variant.skin}`;
}
