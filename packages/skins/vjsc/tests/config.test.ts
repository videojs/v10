import { describe, expect, it } from 'vite-plus/test';

import { validateSkinConfig } from '../config';
import { createStyleOptions } from '../style';

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

  it('adds the Shadow DOM variant only to HTML targets', () => {
    expect(createStyleOptions({ target: 'react', skin: 'default-video', style: 'tailwind' }).variants).toEqual([
      'default',
      'default-video',
    ]);
    expect(createStyleOptions({ target: 'html', skin: 'minimal-video', style: 'tailwind' }).variants).toEqual([
      'minimal',
      'minimal-video',
      'shadow-dom',
    ]);
    expect(createStyleOptions({ target: 'react', skin: 'default-audio', style: 'tailwind' }).variants).toEqual([
      'default',
      'default-audio',
    ]);
    expect(createStyleOptions({ target: 'html', skin: 'minimal-audio', style: 'tailwind' }).variants).toEqual([
      'minimal',
      'minimal-audio',
      'shadow-dom',
    ]);
    expect(createStyleOptions({ target: 'react', skin: 'default-live-video', style: 'tailwind' }).variants).toEqual([
      'default',
      'default-live-video',
    ]);
    expect(createStyleOptions({ target: 'html', skin: 'minimal-live-video', style: 'tailwind' }).variants).toEqual([
      'minimal',
      'minimal-live-video',
      'shadow-dom',
    ]);
  });
});
