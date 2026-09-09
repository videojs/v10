import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vite-plus/test';

const posterStyles = new URL('../styles/layout/poster.styles.ts', import.meta.url);

describe('poster styles', () => {
  it('hides the image part while it has no source', async () => {
    const source = await readFile(posterStyles, 'utf8');

    expect(source).toContain('[&:not([src]):not([srcset])]:invisible');
  });

  it('hides source-less slotted images in the Shadow DOM', async () => {
    const source = await readFile(posterStyles, 'utf8');

    expect(source).toContain('[&>slot::slotted(img:not([src]):not([srcset]))]:invisible');
  });
});
