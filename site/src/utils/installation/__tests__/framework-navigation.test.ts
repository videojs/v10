import { describe, expect, it } from 'vite-plus/test';

import {
  canonicalShadcnInstallationUrl,
  isShadcnInstallationUrl,
  resolveInstallationFrameworkNavigation,
  resolveShadcnUrlSelection,
  updateShadcnInstallationUrl,
} from '../framework-navigation';

describe('resolveInstallationFrameworkNavigation', () => {
  it('replaces equivalent React and HTML installation pages', () => {
    const current = new URL('https://videojs.org/docs/guides/installation/react?preset=audio');

    expect(resolveInstallationFrameworkNavigation(current, 'html')).toEqual({
      target: '/docs/guides/installation/html?preset=audio',
      history: 'replace',
    });
  });

  it('pushes when entering or leaving a dedicated framework guide', () => {
    const html = new URL('https://videojs.org/docs/guides/installation/html?media=hls');
    const svelte = new URL('https://videojs.org/docs/guides/installation/svelte');

    expect(resolveInstallationFrameworkNavigation(html, 'vue')).toEqual({
      target: '/docs/guides/installation/vue?media=hls',
      history: 'push',
    });
    expect(resolveInstallationFrameworkNavigation(svelte, 'react')).toEqual({
      target: '/docs/guides/installation/react',
      history: 'push',
    });
  });

  it('moves framework changes from CDN to Packaged', () => {
    const cdn = new URL('https://videojs.org/docs/guides/installation/cdn?preset=audio');

    expect(resolveInstallationFrameworkNavigation(cdn, 'react')).toEqual({
      target: '/docs/guides/installation/react?preset=audio',
      history: 'push',
    });
  });
});

describe('resolveShadcnUrlSelection', () => {
  it('uses a valid query before the saved fallback', () => {
    const url = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=html');

    expect(resolveShadcnUrlSelection(url, 'react')).toMatchObject({ framework: 'html' });
  });

  it('uses the saved fallback for a missing query and falls back to HTML for Vue', () => {
    expect(
      resolveShadcnUrlSelection(new URL('https://videojs.org/docs/guides/installation/shadcn'), 'html')
    ).toMatchObject({ framework: 'html' });
    expect(
      resolveShadcnUrlSelection(new URL('https://videojs.org/docs/guides/installation/shadcn?framework=vue'), 'react')
    ).toMatchObject({ framework: 'html' });
  });

  it('does not resolve non-Shadcn routes', () => {
    const url = new URL('https://videojs.org/docs/guides/installation/react?framework=html');

    expect(isShadcnInstallationUrl(url)).toBe(false);
    expect(resolveShadcnUrlSelection(url, 'react')).toBeNull();
  });

  it('keeps only template and styling values compatible with the selected source', () => {
    const html = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=html&template=next&styling=tailwind'
    );
    const react = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&template=vite&styling=css'
    );

    expect(resolveShadcnUrlSelection(html, 'react')).toMatchObject({ template: null, styling: null });
    expect(resolveShadcnUrlSelection(react, 'html')).toMatchObject({ template: 'vite', styling: 'css' });
  });
});

describe('canonicalShadcnInstallationUrl', () => {
  it('canonicalizes invalid project options and a Vue query once', () => {
    const url = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=vue&template=next&styling=tailwind&preset=audio'
    );

    expect(canonicalShadcnInstallationUrl(url, 'react')?.search).toBe('?framework=html&preset=audio');
  });
});

describe('updateShadcnInstallationUrl', () => {
  it('clears framework-owned options the next framework cannot use', () => {
    const url = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&template=next&styling=tailwind&preset=audio'
    );
    const target = updateShadcnInstallationUrl(url, { framework: 'html' });

    expect(target.search).toBe('?framework=html&preset=audio');
  });

  it('preserves explicit app and styling choices shared by the next framework', () => {
    const url = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&template=vite&styling=css&preset=audio'
    );
    const target = updateShadcnInstallationUrl(url, { framework: 'html' });

    expect(target.search).toBe('?framework=html&template=vite&styling=css&preset=audio');
  });

  it('serializes compatible choices even when the current route omits its defaults', () => {
    const url = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=html');
    const target = updateShadcnInstallationUrl(url, {
      framework: 'react',
      template: 'vite',
      styling: 'css',
    });

    expect(target.search).toBe('?framework=react&template=vite&styling=css');
  });
});
