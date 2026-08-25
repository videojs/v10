import { describe, expect, it } from 'vite-plus/test';

import { validateSkinConfig } from '../config';

describe('validateSkinConfig', () => {
  it('accepts css style output', () => {
    expect(validateSkinConfig(new URLSearchParams('target=react&skin=default-video&style=css'))).toEqual({
      target: 'react',
      skin: 'default-video',
      style: 'css',
    });
  });

  it('rejects the former vanilla style name', () => {
    expect(validateSkinConfig(new URLSearchParams('target=react&skin=default-video&style=vanilla'))).toBeNull();
  });
});
