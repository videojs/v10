import { describe, expect, it } from 'vitest';
import { skinRegistry } from '../../../canonical/registry/config';
import { canonicalRoot, loadSkinCatalog } from '../../catalog/load';
import { resolveSkinClosure } from '../../catalog/resolve';
import { createRegistryManifest } from '../manifest';
import { generateReactRegistry } from '../source';

describe('generateReactRegistry', () => {
  it('emits individual React/Tailwind components and a shadcn source manifest', async () => {
    const catalog = await loadSkinCatalog();
    const output = await generateReactRegistry(catalog, {
      rootDir: canonicalRoot,
      sourceRoot: skinRegistry.sourceRoot,
      itemNames: resolveSkinClosure(catalog, skinRegistry.skin).items.map((item) => item.name),
    });
    const entry = output.items['play-button']?.find((file) => file.path.endsWith('/play-button.tsx'));
    const posterEntry = output.items.poster?.find((file) => file.path.endsWith('/poster.tsx'));
    const containerEntry = output.items.container?.find((file) => file.path.endsWith('/container.tsx'));
    const overlayEntry = output.items.overlay?.find((file) => file.path.endsWith('/overlay.tsx'));
    const registry = createRegistryManifest(catalog, output, skinRegistry);
    const playButton = registry.items.find((item) => item.name === 'play-button');

    expect(entry?.content).not.toContain('styles/tailwind.css');
    expect(posterEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).not.toContain('/poster/poster');
    expect(overlayEntry?.content).toContain('<div className="pointer-events-none absolute inset-0');
    expect(entry?.content).toMatch(/from ["']@\/components\/videojs\/button-tooltip\/button-tooltip["']/);
    expect(entry?.content).toContain('grid size-media-control');
    expect(playButton?.files.some((file) => file.path.endsWith('/play-button/play-button.tsx'))).toBe(true);
    expect(playButton?.registryDependencies).toBeUndefined();
    expect(playButton?.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton?.meta).toEqual({
      framework: 'react',
      style: 'tailwind',
      skin: skinRegistry.skin,
    });
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/play-button'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/container'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/overlay'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/poster'
    );
    expect(registry.items.find((item) => item.name === 'container')?.dependencies).toEqual([
      '@videojs/react',
      '@videojs/utils',
    ]);
    expect(registry.items.find((item) => item.name === 'container')?.registryDependencies).toBeUndefined();
    expect(registry.items.some((item) => item.name === 'button-tooltip')).toBe(false);
    const tailwind = output.sharedFiles.find((file) => file.path.endsWith('/styles/tailwind.css'));
    expect(tailwind?.content).toContain('@import "tailwindcss";');
    expect(tailwind?.content).not.toContain('theme(inline)');
    expect(tailwind?.content).toContain('@theme {');
  });
});
