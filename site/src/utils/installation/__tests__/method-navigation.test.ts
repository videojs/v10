import { describe, expect, it } from 'vite-plus/test';

import { resolveInstallationMethodHref, resolveInstallationMethodUrl } from '../method-navigation';
import { DEFAULT_SELECTION } from '../url-state';

describe('resolveInstallationMethodUrl', () => {
  it('carries shared choices and the selected framework into Shadcn', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/html?preset=audio&skin=minimal');
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/shadcn', 'shadcn');

    expect(result.pathname).toBe('/docs/guides/installation/shadcn');
    expect(result.searchParams.get('framework')).toBe('html');
    expect(result.searchParams.get('preset')).toBe('audio');
    expect(result.searchParams.get('skin')).toBe('minimal');
  });

  it('drops the no-scaffold choice when switching to Shadcn', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/html?template=none');
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/shadcn', 'shadcn');

    expect(result.searchParams.get('framework')).toBe('html');
    expect(result.searchParams.has('template')).toBe(false);
  });

  it('keeps the existing-site choice when switching to CDN', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/html?template=none');
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/cdn', 'cdn');

    expect(result.searchParams.get('template')).toBe('none');
  });

  it('keeps the Vue or Svelte project framework while using Shadcn HTML source', () => {
    for (const framework of ['vue', 'svelte']) {
      const current = new URL(`https://videojs.org/docs/guides/installation/${framework}?preset=audio&skin=minimal`);
      const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/shadcn', 'shadcn');

      expect(result.searchParams.get('framework')).toBe(framework);
      expect(result.searchParams.get('preset')).toBe('audio');
      expect(result.searchParams.get('skin')).toBe('minimal');
    }
  });

  it('returns from Shadcn to the selected packaged framework', () => {
    const current = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=html&preset=audio&template=astro&styling=css'
    );
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation', 'packaged');

    expect(result.pathname).toBe('/docs/guides/installation/html');
    expect(result.searchParams.has('framework')).toBe(false);
    expect(result.searchParams.get('template')).toBe('astro');
    expect(result.searchParams.has('styling')).toBe(false);
    expect(result.searchParams.get('preset')).toBe('audio');
  });

  it('returns from Shadcn to the selected Vue packaged guide', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=vue&preset=audio');
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/vue', 'packaged');

    expect(result.pathname).toBe('/docs/guides/installation/vue');
    expect(result.searchParams.has('framework')).toBe(false);
  });

  it('returns from CDN to packaged HTML with the shared choices', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/cdn?preset=audio&skin=minimal');
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/html', 'packaged');

    expect(result.pathname).toBe('/docs/guides/installation/html');
    expect(result.searchParams.get('preset')).toBe('audio');
    expect(result.searchParams.get('skin')).toBe('minimal');
  });

  it('uses choices already written into the card destination', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/html?preset=audio');
    const result = resolveInstallationMethodUrl(
      current,
      '/docs/guides/installation/shadcn?preset=live-video&framework=html',
      'shadcn'
    );

    expect(result.searchParams.get('preset')).toBe('live-video');
    expect(result.searchParams.get('framework')).toBe('html');
  });

  it('removes the source framework when switching to CDN', () => {
    const current = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&preset=video&package-manager=pnpm&template=vite&styling=css'
    );
    const result = resolveInstallationMethodUrl(current, '/docs/guides/installation/cdn', 'cdn');

    expect(result.pathname).toBe('/docs/guides/installation/cdn');
    expect(result.searchParams.has('framework')).toBe(false);
    expect(result.searchParams.get('package-manager')).toBe('pnpm');
    expect(result.searchParams.has('template')).toBe(false);
    expect(result.searchParams.has('styling')).toBe(false);
    expect(result.searchParams.get('preset')).toBe('video');
  });
});

describe('resolveInstallationMethodHref', () => {
  it('writes the selected Vue or Svelte framework when switching to Shadcn', () => {
    for (const framework of ['vue', 'svelte'] as const) {
      const current = new URL(`https://videojs.org/docs/guides/installation/${framework}`);
      const result = resolveInstallationMethodHref(
        current,
        '/docs/guides/installation/shadcn',
        'shadcn',
        DEFAULT_SELECTION,
        framework
      );

      expect(result).toBe(`/docs/guides/installation/shadcn?framework=${framework}`);
    }
  });

  it('uses the selected Shadcn framework when returning to Packaged', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=react');
    const result = resolveInstallationMethodHref(
      current,
      '/docs/guides/installation/html',
      'packaged',
      { ...DEFAULT_SELECTION, useCase: 'default-audio', skin: 'minimal-audio', renderer: 'html5-audio' },
      'html'
    );

    expect(result).toBe('/docs/guides/installation/html?preset=audio&skin=minimal');
  });

  it('keeps the package manager needed to run the CDN Vite app', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/html');
    const result = resolveInstallationMethodHref(current, '/docs/guides/installation/cdn', 'cdn', {
      ...DEFAULT_SELECTION,
      installMethod: 'bun',
      useCase: 'default-audio',
      skin: 'minimal-audio',
      renderer: 'html5-audio',
      sourceUrl: 'https://example.com/audio.mp3',
    });

    expect(result).toBe(
      '/docs/guides/installation/cdn?preset=audio&skin=minimal&package-manager=bun&source-url=https%3A%2F%2Fexample.com%2Faudio.mp3'
    );
  });
});
