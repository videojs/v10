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
    expect(manifest.peerMarkers).toEqual(new Set());
  });
});
