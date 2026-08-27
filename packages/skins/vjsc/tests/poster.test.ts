import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vite-plus/test';

const posterStyles = new URL('../styles/layout/poster.styles.ts', import.meta.url);

describe('poster styles', () => {
  it('hides rendered images while they have no source', async () => {
    const source = await readFile(posterStyles, 'utf8');

    expect(source).toContain('[&:is(img):not([src]):not([srcset])]:invisible');
  });

  it('hides source-less fallback and slotted images in the Shadow DOM', async () => {
    const source = await readFile(posterStyles, 'utf8');

    expect(source).toContain('[&>slot>img:not([src]):not([srcset])]:invisible');
    expect(source).toContain('[&_::slotted(img:not([src]):not([srcset]))]:invisible');
  });
});
