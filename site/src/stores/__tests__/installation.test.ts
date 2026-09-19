import { describe, expect, it } from 'vitest';

import { installMethod, renderer, skin, sourceUrl, syncInstallationSelectionFromUrl, useCase } from '../installation';

describe('useCase', () => {
  it('fits the skin and media to the new preset from the store values', () => {
    useCase.set('default-video');
    skin.set('minimal-video');
    renderer.set('youtube');

    useCase.set('default-audio');

    expect(skin.get()).toBe('minimal-audio');
    expect(renderer.get()).toBe('html5-audio');

    useCase.set('live-video');

    expect(skin.get()).toBe('minimal-video');
    expect(renderer.get()).toBe('hls');
  });

  it('replaces stale picks when a client navigation has a different URL', () => {
    syncInstallationSelectionFromUrl(
      new URL(
        'https://videojs.org/docs/guides/installation/react?preset=audio&skin=minimal&media=spotify&install-method=pnpm&source-url=track'
      )
    );

    expect(useCase.get()).toBe('default-audio');
    expect(skin.get()).toBe('minimal-audio');
    expect(renderer.get()).toBe('spotify');
    expect(installMethod.get()).toBe('pnpm');
    expect(sourceUrl.get()).toBe('track');

    syncInstallationSelectionFromUrl(new URL('https://videojs.org/docs/guides/installation/cdn'));

    expect(useCase.get()).toBe('default-video');
    expect(skin.get()).toBe('video');
    expect(renderer.get()).toBe('html5-video');
    expect(installMethod.get()).toBe('npm');
    expect(sourceUrl.get()).toBe('');
  });
});
