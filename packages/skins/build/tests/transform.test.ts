import { describe, expect, it } from 'vite-plus/test';

import { createStyleOptions, validateSkinConfig } from '../transform';

describe('validateSkinConfig', () => {
  it('accepts css style output', () => {
    expect(validateSkinConfig(new URLSearchParams('target=react&skin=default-video&style=css&theme=default'))).toEqual({
      target: 'react',
      skin: 'default-video',
      style: 'css',
      theme: 'default',
    });
  });

  it('rejects the former vanilla style name', () => {
    expect(
      validateSkinConfig(new URLSearchParams('target=react&skin=default-video&style=vanilla&theme=default'))
    ).toBeNull();
  });

  it('accepts theme-specific, skin-independent React component transforms', () => {
    expect(validateSkinConfig(new URLSearchParams('target=react&style=css&theme=minimal'))).toEqual({
      target: 'react',
      style: 'css',
      theme: 'minimal',
    });
    expect(createStyleOptions({ target: 'react', style: 'css', theme: 'minimal' }, 'theme')).toMatchObject({
      variants: ['minimal'],
      stylesheet: { scope: '.media-skin[data-theme="minimal"]' },
    });
    expect(validateSkinConfig(new URLSearchParams('target=html&style=css&theme=default'))).toBeNull();
    expect(validateSkinConfig(new URLSearchParams('target=react&style=css'))).toBeNull();
  });

  it('adds the Shadow DOM variant only to HTML targets', () => {
    expect(
      createStyleOptions({ target: 'react', skin: 'default-video', style: 'tailwind', theme: 'default' }).variants
    ).toEqual(['default', 'video']);
    expect(
      createStyleOptions({ target: 'html', skin: 'minimal-video', style: 'tailwind', theme: 'minimal' }).variants
    ).toEqual(['minimal', 'video', 'shadow-dom']);
    expect(
      createStyleOptions({ target: 'react', skin: 'default-audio', style: 'tailwind', theme: 'default' }).variants
    ).toEqual(['default', 'audio']);
    expect(
      createStyleOptions({ target: 'html', skin: 'minimal-audio', style: 'tailwind', theme: 'minimal' }).variants
    ).toEqual(['minimal', 'audio', 'shadow-dom']);
    expect(
      createStyleOptions({ target: 'react', skin: 'default-live-video', style: 'tailwind', theme: 'default' }).variants
    ).toEqual(['default', 'live-video']);
    expect(
      createStyleOptions({ target: 'html', skin: 'minimal-live-video', style: 'tailwind', theme: 'minimal' }).variants
    ).toEqual(['minimal', 'live-video', 'shadow-dom']);
    expect(
      createStyleOptions({ target: 'react', skin: 'default-live-audio', style: 'tailwind', theme: 'default' }).variants
    ).toEqual(['default', 'live-audio']);
    expect(
      createStyleOptions({ target: 'html', skin: 'minimal-live-audio', style: 'tailwind', theme: 'minimal' }).variants
    ).toEqual(['minimal', 'live-audio', 'shadow-dom']);
  });
});
