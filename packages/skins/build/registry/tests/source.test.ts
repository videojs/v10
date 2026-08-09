import { describe, expect, it } from 'vitest';
import { canonicalRoot, loadSkinManifest } from '../../graph/load';
import { generateReactRegistry } from '../source';

describe('generateReactRegistry', () => {
  it('derives source layouts from Skin item types', async () => {
    const manifest = await loadSkinManifest();
    const output = await generateReactRegistry(manifest, {
      rootDir: canonicalRoot,
      itemNames: ['default-video', 'play-button'],
    });

    expect(Object.keys(output.items)).toEqual(['default-video', 'play-button']);
    expect(output.items['default-video']?.some((file) => file.path === 'skin.tsx')).toBe(true);
    expect(output.items['play-button']?.some((file) => file.path === 'components/play-button/play-button.tsx')).toBe(
      true
    );
    expect(output.dependencies['play-button']).toEqual(['@videojs/react']);
  });
});
