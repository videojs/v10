import { describe, expect, it } from 'vite-plus/test';

import { createStyleOptions } from '../transform';
import { parseVariant } from '../variants';

describe('parseVariant', () => {
  it('accepts css style output', () => {
    expect(parseVariant(new URLSearchParams('target=react&skin=default-video&style=css&theme=default'))).toEqual({
      target: 'react',
      skin: 'default-video',
      style: 'css',
      theme: 'default',
    });
  });

  it('rejects the former vanilla style name', () => {
    expect(() =>
      parseVariant(new URLSearchParams('target=react&skin=default-video&style=vanilla&theme=default'))
    ).toThrow('needs `style=css` or `style=tailwind`');
  });

  it('leaves queries without variant parameters to other tools', () => {
    expect(parseVariant(new URLSearchParams('raw'))).toBeNull();
    expect(parseVariant(new URLSearchParams())).toBeNull();
  });

  it('accepts theme-specific, skin-independent React component transforms', () => {
    expect(parseVariant(new URLSearchParams('target=react&style=css&theme=minimal'))).toEqual({
      target: 'react',
      style: 'css',
      theme: 'minimal',
    });
    expect(createStyleOptions({ target: 'react', style: 'css', theme: 'minimal' }, 'theme')).toMatchObject({
      variants: ['minimal'],
      stylesheet: { scope: '.media-skin[data-theme="minimal"]' },
    });
    expect(() => parseVariant(new URLSearchParams('target=html&style=css&theme=default'))).toThrow('needs a `skin`');
    expect(() => parseVariant(new URLSearchParams('target=react&style=css'))).toThrow('needs `theme=default`');
    expect(() => parseVariant(new URLSearchParams('target=react&skin=minimal-video&style=css&theme=default'))).toThrow(
      'wrong theme'
    );
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

describe('createStyleOptions', () => {
  it('styles reusable components for their theme alone, whichever skin compiles them', () => {
    expect(
      createStyleOptions({ target: 'html', skin: 'minimal-audio', style: 'css', theme: 'minimal' }, 'theme')
    ).toMatchObject({
      variants: ['minimal', 'shadow-dom'],
      stylesheet: { scope: '.media-skin[data-theme="minimal"]' },
    });
  });

  it('requires a skin for skin-scoped styles instead of guessing one', () => {
    expect(() => createStyleOptions({ target: 'react', style: 'css', theme: 'default' })).toThrow(
      'Skin-scoped styles need a variant that names its skin'
    );
  });
});
