import { afterEach, describe, expect, it } from 'vitest';

import { installMethod, renderer, skin, sourceUrl, syncInstallationSelectionFromUrl, useCase } from '../installation';

describe('useCase', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

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
        'https://videojs.org/docs/guides/installation/react?preset=audio&skin=minimal&media=spotify&package-manager=pnpm&source-url=track'
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
    expect(installMethod.get()).toBe('pnpm');
    expect(sourceUrl.get()).toBe('');
  });

  it('normalizes invalid URL picks to the selection shown by the page', () => {
    window.history.replaceState(
      { index: 2, scrollX: 0, scrollY: 300 },
      '',
      '/docs/guides/installation/react?preset=audio&skin=fancy&media=youtube&package-manager=deno&source-url=line%0Abreak&utm_source=test'
    );

    syncInstallationSelectionFromUrl();

    expect(window.location.search).toBe('?preset=audio&utm_source=test');
    expect(window.history.state).toEqual({ index: 2, scrollX: 0, scrollY: 300 });
    expect(useCase.get()).toBe('default-audio');
    expect(skin.get()).toBe('audio');
    expect(renderer.get()).toBe('html5-audio');
    expect(installMethod.get()).toBe('pnpm');
    expect(sourceUrl.get()).toBe('');
  });

  it('leaves installation-shaped parameters alone outside installation guides', () => {
    window.history.replaceState(
      { index: 2 },
      '',
      '/docs/framework/react/guides/architecture?framework=html&package-manager=npm&styling=css&utm_source=test'
    );

    syncInstallationSelectionFromUrl();
    useCase.set('default-audio');

    expect(window.location.search).toBe('?framework=html&package-manager=npm&styling=css&utm_source=test');
    expect(window.history.state).toEqual({ index: 2 });
  });

  it('normalizes choices unavailable from the Shadcn route', () => {
    window.history.replaceState(
      null,
      '',
      '/docs/guides/installation/shadcn?framework=react&preset=background-video&skin=none&media=background-video&package-manager=pnpm'
    );

    syncInstallationSelectionFromUrl();

    expect(window.location.search).toBe('?framework=react');
    expect(useCase.get()).toBe('default-video');
    expect(skin.get()).toBe('video');
    expect(renderer.get()).toBe('html5-video');
    expect(installMethod.get()).toBe('pnpm');
  });

  it('normalizes the address bar after an Astro client transition', () => {
    const destination = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&preset=background-video&skin=none&package-manager=pnpm'
    );

    // `before-swap` publishes destination state while the browser still has the departing URL.
    syncInstallationSelectionFromUrl(destination);
    window.history.replaceState({ index: 3 }, '', `${destination.pathname}${destination.search}`);
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(window.location.search).toBe('?framework=react');
    expect(window.history.state).toEqual({ index: 3 });
    expect(useCase.get()).toBe('default-video');
    expect(skin.get()).toBe('video');
  });
});
