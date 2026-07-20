import { describe, expect, it } from 'vitest';

import { mergeLocaleOverlays } from '../locale/merge-locale-overlays';

describe('mergeLocaleOverlays', () => {
  it('merges layers least-specific to most-specific', async () => {
    const chain = (_locale: string) => ['es', 'en'];
    const load = async (tag: string): Promise<Partial<Record<'a' | 'b' | 'c', string>> | undefined> =>
      tag === 'en' ? { a: 'en-a', b: 'en-b' } : tag === 'es' ? { b: 'es-b', c: 'es-c' } : undefined;

    const { merged, loadedTags } = await mergeLocaleOverlays('es', load, chain);
    expect(merged).toEqual({ a: 'en-a', b: 'es-b', c: 'es-c' });
    expect(loadedTags).toEqual(['es', 'en']);
  });

  it('skips undefined layers', async () => {
    const chain = () => ['xx', 'en'];
    const load = async (tag: string) => (tag === 'en' ? { k: 'v' } : undefined);
    const { merged, loadedTags } = await mergeLocaleOverlays('xx', load, chain);
    expect(merged).toEqual({ k: 'v' });
    expect(loadedTags).toEqual(['en']);
  });
});
