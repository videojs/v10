import { describe, expect, it } from 'vite-plus/test';

import { getDocTypeFromId } from '../../../types/docs';

describe('getDocTypeFromId', () => {
  it('maps each content folder to its type', () => {
    expect(getDocTypeFromId('guides/autoplay')).toBe('guide');
    expect(getDocTypeFromId('guides/features')).toBe('guide');
    expect(getDocTypeFromId('reference/components/play-button')).toBe('reference');
    expect(getDocTypeFromId('reference/api/use-player')).toBe('reference');
  });

  it('treats the contributor authoring guides as guides', () => {
    expect(getDocTypeFromId('writing-style/write-guides')).toBe('guide');
  });

  it('rejects pages outside a typed folder', () => {
    expect(() => getDocTypeFromId('concepts/features')).toThrow(/not inside a typed folder/);
    expect(() => getDocTypeFromId('loose-page')).toThrow(/not inside a typed folder/);
  });
});
