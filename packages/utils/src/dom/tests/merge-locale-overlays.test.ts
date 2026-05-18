import { describe, expect, it } from 'vitest';

import { mergeLocaleOverlays } from '../merge-locale-overlays';

describe('mergeLocaleOverlays', () => {
  it('merges layers least-specific to most-specific', async () => {
    const chain = (_locale: string) => ['es', 'en'];
    const load = async (tag: string): Promise<Partial<Record<'a' | 'b' | 'c', string>> | undefined> =>
      tag === 'en' ? { a: 'en-a', b: 'en-b' } : tag === 'es' ? { b: 'es-b', c: 'es-c' } : undefined;

    const merged = await mergeLocaleOverlays('es', load, chain);
    expect(merged).toEqual({ a: 'en-a', b: 'es-b', c: 'es-c' });
  });

  it('skips undefined layers', async () => {
    const chain = () => ['en', 'xx'];
    const load = async (tag: string) => (tag === 'en' ? { k: 'v' } : undefined);
    expect(await mergeLocaleOverlays('xx', load, chain)).toEqual({ k: 'v' });
  });
});
