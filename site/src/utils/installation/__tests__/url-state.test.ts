import { describe, expect, it } from 'vitest';

import {
  coerceToPreset,
  DEFAULT_SELECTION,
  normalizeInstallationSelectionForRoute,
  parseInstallationSearch,
  serializeInstallationSearch,
} from '../url-state';

describe('parseInstallationSearch', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseInstallationSearch('')).toEqual(DEFAULT_SELECTION);
  });

  it('reads the CLI vocabulary', () => {
    expect(parseInstallationSearch('?preset=live-video&skin=minimal&media=hls&install-method=npm')).toEqual({
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
    const selection = parseInstallationSearch('?preset=live-audio&media=youtube&skin=fancy&install-method=curl');

    expect(selection.useCase).toBe('live-audio');
    expect(selection.renderer).toBe('mux-audio');
    expect(selection.skin).toBe('audio');
    expect(selection.installMethod).toBe('npm');
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

describe('serializeInstallationSearch', () => {
  it('writes nothing for the defaults', () => {
    expect(serializeInstallationSearch(DEFAULT_SELECTION)).toBe('');
  });

  it('writes only what differs from the preset defaults', () => {
    expect(
      serializeInstallationSearch({
        useCase: 'live-video',
        skin: 'minimal-video',
        renderer: 'hls',
        sourceUrl: '',
        installMethod: 'npm',
      })
    ).toBe('?preset=live-video&skin=minimal');
  });

  it('round-trips through parse', () => {
    const selection = {
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
      '?utm_source=x&install-method=bun'
    );
  });

  it('drops the Markdown-only package-manager alias', () => {
    expect(serializeInstallationSearch(DEFAULT_SELECTION, '?package-manager=pnpm&utm_source=x')).toBe('?utm_source=x');
  });
});

describe('coerceToPreset', () => {
  it('keeps the skin tier across media types and drops media the preset cannot play', () => {
    expect(coerceToPreset('default-audio', 'minimal-video', 'youtube')).toEqual({
      skin: 'minimal-audio',
      renderer: 'html5-audio',
    });
    expect(coerceToPreset('live-video', 'none', 'mux-video')).toEqual({ skin: 'none', renderer: 'mux-video' });
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
