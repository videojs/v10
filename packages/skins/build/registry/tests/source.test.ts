import { describe, expect, it } from 'vitest';
import { canonicalRoot, loadSkinCatalog } from '../../catalog/load';
import { generateReactRegistry } from '../source';

describe('generateReactRegistry', () => {
  it('derives source layouts from Skin item types', async () => {
    const catalog = await loadSkinCatalog();
    const output = await generateReactRegistry(catalog, {
      rootDir: canonicalRoot,
      itemNames: ['default-video', 'play-button'],
    });

    expect(Object.keys(output.items)).toEqual(['default-video', 'play-button']);
    expect(output.items['default-video']?.some((file) => file.path === 'skin.tsx')).toBe(true);
    expect(output.items['play-button']?.some((file) => file.path === 'components/play-button/play-button.tsx')).toBe(
      true
    );
    expect(output.sharedFiles.map((file) => file.path)).toEqual([
      'styles/tailwind.css',
      'styles/base.css',
      'styles/themes/default.css',
    ]);
    expect(
      Object.values(output.items)
        .flat()
        .every((file) => file.kind === 'source')
    ).toBe(true);
    expect(output.dependencies['play-button']).toEqual(['@videojs/react']);
  });
});
