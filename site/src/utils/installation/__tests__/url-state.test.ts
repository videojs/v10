import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SELECTION,
  normalizeInstallationSelectionForRoute,
  parseInstallationSearch,
  parseInstallationSearchForRoute,
  serializeInstallationSearch,
  serializeInstallationSearchForRoute,
} from '../url-state';

describe('parseInstallationSearch', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseInstallationSearch('')).toEqual(DEFAULT_SELECTION);
  });

  it('reads the CLI vocabulary', () => {
    expect(parseInstallationSearch('?preset=live-video&skin=minimal&media=hls&package-manager=npm')).toEqual({
      framework: 'react',
      template: 'next',
      useCase: 'live-video',
      skin: 'minimal-video',
      renderer: 'hls',
      sourceUrl: '',
      installMethod: 'npm',
    });
  });

  it('maps the skin tier onto the audio skins for audio presets', () => {
    expect(parseInstallationSearch('?preset=audio').skin).toBe('audio');
    expect(parseInstallationSearch('?preset=audio&skin=minimal').skin).toBe('minimal-audio');
    expect(parseInstallationSearch('?preset=audio&skin=none').skin).toBe('none');
  });

  it('drops media the preset cannot play and ignores unknown values', () => {
    const selection = parseInstallationSearch('?preset=live-audio&media=youtube&skin=fancy&package-manager=curl');

    expect(selection.useCase).toBe('live-audio');
    expect(selection.renderer).toBe('mux-audio');
    expect(selection.skin).toBe('audio');
    expect(selection.installMethod).toBe('pnpm');
  });

  it('keeps the source url verbatim', () => {
    expect(parseInstallationSearch('?source-url=https%3A%2F%2Fexample.com%2Fa.m3u8').sourceUrl).toBe(
      'https://example.com/a.m3u8'
    );
  });

  it('drops source URLs containing control characters', () => {
    expect(parseInstallationSearch('?source-url=line%0Abreak').sourceUrl).toBe('');
    expect(parseInstallationSearch('?source-url=line%E2%80%A8break').sourceUrl).toBe('');
  });
});

describe('parseInstallationSearchForRoute', () => {
  it('validates app setup against the framework fixed by a dedicated route', () => {
    expect(parseInstallationSearchForRoute('vue', '?template=nuxt')).toMatchObject({
      framework: 'vue',
      template: 'nuxt',
    });
    expect(parseInstallationSearchForRoute('svelte', '?template=sveltekit')).toMatchObject({
      framework: 'svelte',
      template: 'sveltekit',
    });
  });

  it('uses the framework query only on the shared Shadcn route', () => {
    expect(parseInstallationSearchForRoute('shadcn', '?framework=vue&template=nuxt')).toMatchObject({
      framework: 'vue',
      template: 'nuxt',
    });
    expect(parseInstallationSearchForRoute('vue', '?framework=react&template=nuxt')).toMatchObject({
      framework: 'vue',
      template: 'nuxt',
    });
  });

  it('keeps no scaffold on packaged HTML and resets it for Shadcn', () => {
    expect(parseInstallationSearchForRoute('html', '?template=none')).toMatchObject({ template: 'none' });
    expect(parseInstallationSearchForRoute('cdn', '?template=none')).toMatchObject({ template: 'none' });
    expect(parseInstallationSearchForRoute('shadcn', '?framework=html&template=none')).toMatchObject({
      framework: 'html',
      template: 'vite',
    });
  });
});

describe('serializeInstallationSearch', () => {
  it('writes nothing for the defaults', () => {
    expect(serializeInstallationSearch(DEFAULT_SELECTION)).toBe('');
  });

  it('writes only what differs from the preset defaults', () => {
    expect(
      serializeInstallationSearch({
        framework: 'react',
        template: 'next',
        useCase: 'live-video',
        skin: 'minimal-video',
        renderer: 'hls',
        sourceUrl: '',
        installMethod: 'pnpm',
      })
    ).toBe('?preset=live-video&skin=minimal');
  });

  it('round-trips through parse', () => {
    const selection = {
      framework: 'html',
      template: 'astro',
      useCase: 'default-audio',
      skin: 'none',
      renderer: 'spotify',
      sourceUrl: 'https://open.spotify.com/track/1',
      installMethod: 'pnpm',
    } as const;

    expect(parseInstallationSearch(serializeInstallationSearch(selection))).toEqual(selection);
  });

  it('preserves unrelated params', () => {
    expect(serializeInstallationSearch({ ...DEFAULT_SELECTION, installMethod: 'bun' }, '?utm_source=x')).toBe(
      '?utm_source=x&package-manager=bun'
    );
  });

  it('omits the hidden skin choice for background video', () => {
    const background = parseInstallationSearch('?preset=background-video&skin=minimal&media=background-video');

    expect(serializeInstallationSearch(background)).toBe('?preset=background-video');
  });
});

describe('serializeInstallationSearchForRoute', () => {
  it('keeps only parameters supported by the current installation route', () => {
    const search = '?method=shadcn&framework=vue&template=astro&styling=css&package-manager=pnpm&utm_source=docs';
    const vue = { ...DEFAULT_SELECTION, framework: 'vue', template: 'vite' } as const;

    expect(serializeInstallationSearchForRoute('vue', vue, search)).toBe('?utm_source=docs');
    expect(serializeInstallationSearchForRoute('cdn', DEFAULT_SELECTION, search)).toBe('?utm_source=docs');
    expect(serializeInstallationSearchForRoute('shadcn', vue, search)).toBe(
      '?framework=vue&styling=css&utm_source=docs'
    );
  });
});

describe('normalizeInstallationSelectionForRoute', () => {
  it('fits unsupported Shadcn choices to the player shown by the page', () => {
    const background = parseInstallationSearch('?preset=background-video&skin=minimal&media=background-video');
    const noSkin = parseInstallationSearch('?preset=audio&skin=none&media=spotify');

    expect(normalizeInstallationSelectionForRoute('shadcn', background)).toMatchObject({
      useCase: 'default-video',
      skin: 'minimal-video',
      renderer: 'html5-video',
    });
    expect(normalizeInstallationSelectionForRoute('shadcn', noSkin)).toMatchObject({
      useCase: 'default-audio',
      skin: 'audio',
      renderer: 'spotify',
    });
  });
});
