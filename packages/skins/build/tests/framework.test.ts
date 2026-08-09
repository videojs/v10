import { describe, expect, it } from 'vitest';
import { createFrameworkSkin } from '../framework';
import { loadSkinManifest, skinsRoot } from '../load';

describe('createFrameworkSkin', () => {
  it('bundles React into one Skin module and vanilla stylesheet', async () => {
    const output = await createFrameworkSkin(await loadSkinManifest(), {
      framework: 'react',
      rootDir: skinsRoot,
      skin: 'default-video',
    });

    expect(output.sourceFile).toBe('skin.tsx');
    expect(output.source).toContain("import './styles.css'");
    expect(output.source).toContain('function PlayButton$1()');
    expect(output.source).toContain('export { DefaultVideoSkin }');
    expect(output.source).not.toContain('./components/');
    expect(output.styles).toContain('.media-play-button {');
    expect(output.styles).not.toContain('--tw-');
  });

  it('bundles HTML registrations and markup into one Skin module', async () => {
    const output = await createFrameworkSkin(await loadSkinManifest(), {
      framework: 'html',
      rootDir: skinsRoot,
      skin: 'default-video',
    });

    expect(output.sourceFile).toBe('skin.ts');
    expect(output.source).toContain("import '@videojs/html/icons/element'");
    expect(output.source).toContain('export const skin = /* html */ `<media-controls');
    expect(output.styles).toContain('.media-play-button {');
    expect(output.styles).not.toContain('--tw-');
  });
});
