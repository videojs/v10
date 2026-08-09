import { describe, expect, it } from 'vitest';
import { skinRegistry } from '../../../canonical/registry/config';
import { canonicalRoot, loadSkinManifest } from '../../graph/load';
import { resolveSkinClosure } from '../../graph/resolve';
import { createRegistryManifest } from '../manifest';
import { generateReactRegistry } from '../source';

describe('generateReactRegistry', () => {
  it('emits individual React/Tailwind components and a shadcn source manifest', async () => {
    const manifest = await loadSkinManifest();
    const output = await generateReactRegistry(manifest, {
      rootDir: canonicalRoot,
      targetRoot: 'default',
      itemNames: resolveSkinClosure(manifest, 'default-video').itemNames,
    });
    const entry = output.items['play-button']?.find((file) => file.path.endsWith('/play-button.tsx'));
    const registry = createRegistryManifest(manifest, output, skinRegistry);
    const playButton = registry.items.find((item) => item.name === 'play-button');

    expect(entry?.content).not.toContain('styles/tailwind.css');
    expect(entry?.content).toMatch(/from ["']@\/components\/videojs\/button-tooltip\/button-tooltip["']/);
    expect(entry?.content).toContain('grid size-media-control');
    expect(playButton?.files.some((file) => file.path.endsWith('/play-button/play-button.tsx'))).toBe(true);
    expect(playButton?.registryDependencies).toBeUndefined();
    expect(playButton?.dependencies).toEqual(['@videojs/react', 'react']);
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/play-button'
    );
    expect(registry.items.some((item) => item.name === 'button-tooltip')).toBe(false);
    const tailwind = output.items['default-video']?.find((file) => file.path.endsWith('/styles/tailwind.css'));
    expect(tailwind?.content).toContain('@import "tailwindcss";');
    expect(tailwind?.content).not.toContain('theme(inline)');
    expect(tailwind?.content).toContain('@theme {');
  });
});
