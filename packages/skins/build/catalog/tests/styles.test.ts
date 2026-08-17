import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalRoot, loadSkinCatalog } from '../load';
import { loadCatalogStyleManifest } from '../styles';

describe('loadCatalogStyleManifest', () => {
  it('loads canonical style definitions from the selected catalog closure', async () => {
    const catalog = await loadSkinCatalog();
    const manifest = await loadCatalogStyleManifest(catalog, {
      rootDir: canonicalRoot,
      itemNames: ['play-button'],
    });
    const buttonFile = resolve(canonicalRoot, 'styles/components/button.styles.ts');
    const rules = manifest.modules.get(buttonFile);

    expect(rules?.get('root')).toMatchObject({ className: 'media-button', file: 'buttons.css' });
    expect(rules?.get('icons.pause')?.className).toBe('media-pause-icon');
    expect(rules?.get('play')?.utilities).toContain('group/play');
  });
});
