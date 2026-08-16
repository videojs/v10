import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSkinStyleManifest, recipeForToken } from '../manifest';

const stylesRoot = resolve(import.meta.dirname, '../../../canonical/styles');

describe('loadSkinStyleManifest', () => {
  it('derives semantic classes and relationship markers from explicit default exports', async () => {
    const buttonFile = resolve(stylesRoot, 'components/button.tailwind.ts');
    const manifest = await loadSkinStyleManifest([buttonFile]);

    expect(recipeForToken(manifest, buttonFile, ['button'])?.className).toBe('media-button');
    expect(recipeForToken(manifest, buttonFile, ['pauseIcon'])?.className).toBe('media-pause-icon');
    expect(manifest.groupOwners.get('group/play')).toBe('media-play-button');
    expect(manifest.peerOwners).toEqual(new Map());
  });

  it('selects and merges style variants without retaining superseded base utilities', async () => {
    const statusFile = resolve(stylesRoot, 'components/status-indicator.tailwind.ts');
    const defaultManifest = await loadSkinStyleManifest([statusFile], { variant: 'default' });
    const minimalManifest = await loadSkinStyleManifest([statusFile], { variant: 'minimal' });
    const defaultRecipe = recipeForToken(defaultManifest, statusFile, ['statusIndicator']);
    const minimalRecipe = recipeForToken(minimalManifest, statusFile, ['statusIndicator']);

    expect(defaultRecipe?.utilities).toContain('top-3');
    expect(defaultRecipe?.utilities).toContain('rounded-media-pill');
    expect(minimalRecipe?.utilities).toContain('top-0');
    expect(minimalRecipe?.utilities).toContain(
      '[background-image:linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_3rem,transparent)]'
    );
    expect(minimalRecipe?.utilities).not.toContain('top-3');
    expect(minimalRecipe?.utilities).not.toContain('rounded-media-pill');
    expect(minimalRecipe?.utilities).not.toContain('bg-media-surface');
    expect(minimalRecipe?.utilities).not.toContain('bg-black/25');
  });

  it('rejects an unknown style variant', async () => {
    const statusFile = resolve(stylesRoot, 'components/status-indicator.tailwind.ts');

    await expect(loadSkinStyleManifest([statusFile], { variant: 'unknown' })).rejects.toThrow(
      'does not define the `unknown` variant'
    );
  });
});
