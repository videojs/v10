import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vite-plus/test';

const containerStyles = new URL('../styles/layout/container.styles.ts', import.meta.url);

describe('container styles', () => {
  it('sizes the slotted video in the Shadow DOM', async () => {
    const source = await readFile(containerStyles, 'utf8');

    expect(source).toContain('[&>slot::slotted(video)]:h-full [&>slot::slotted(video)]:w-full');
    expect(source).toContain('[&>slot::slotted(video)]:object-media');
  });
});
