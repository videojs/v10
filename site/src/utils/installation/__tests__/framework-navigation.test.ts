import { describe, expect, it } from 'vite-plus/test';

import {
  isShadcnInstallationUrl,
  resolveInstallationFrameworkNavigation,
  resolveShadcnUrlSelection,
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

  it('keeps supported Shadcn frameworks on the same guide', () => {
    const current = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?preset=audio&framework=react#choose-how-to-install'
    );

    expect(resolveInstallationFrameworkNavigation(current, 'html')).toEqual({
      target: '/docs/guides/installation/shadcn?preset=audio&framework=html#choose-how-to-install',
      history: 'replace',
    });
  });

  it('keeps every supported project framework on Shadcn and moves CDN changes to Packaged', () => {
    const shadcn = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=react&skin=minimal');
    const cdn = new URL('https://videojs.org/docs/guides/installation/cdn?preset=audio');

    expect(resolveInstallationFrameworkNavigation(shadcn, 'vue')).toEqual({
      target: '/docs/guides/installation/shadcn?framework=vue&skin=minimal',
      history: 'replace',
    });
    expect(resolveInstallationFrameworkNavigation(cdn, 'react')).toEqual({
      target: '/docs/guides/installation/react?preset=audio',
      history: 'push',
    });
  });
});

describe('resolveShadcnUrlSelection', () => {
  it('uses a valid query before the saved fallback', () => {
    const url = new URL('https://videojs.org/docs/guides/installation/shadcn?framework=html');

    expect(resolveShadcnUrlSelection(url, 'react')).toMatchObject({
      projectFramework: 'html',
      sourceFramework: 'html',
    });
  });

  it('uses the saved fallback for a missing query and derives HTML source for Vue', () => {
    expect(
      resolveShadcnUrlSelection(new URL('https://videojs.org/docs/guides/installation/shadcn'), 'html')
    ).toMatchObject({ projectFramework: 'html', sourceFramework: 'html' });
    expect(
      resolveShadcnUrlSelection(new URL('https://videojs.org/docs/guides/installation/shadcn?framework=vue'), 'react')
    ).toMatchObject({ projectFramework: 'vue', sourceFramework: 'html' });
  });

  it('does not resolve non-Shadcn routes', () => {
    const url = new URL('https://videojs.org/docs/guides/installation/react?framework=html');

    expect(isShadcnInstallationUrl(url)).toBe(false);
    expect(resolveShadcnUrlSelection(url, 'react')).toBeNull();
  });

  it('keeps only template and styling values compatible with the selected source', () => {
    const html = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=vue&template=next&styling=tailwind'
    );
    const react = new URL(
      'https://videojs.org/docs/guides/installation/shadcn?framework=react&template=vite&styling=css'
    );

    expect(resolveShadcnUrlSelection(html, 'react')).toMatchObject({ template: null, styling: null });
    expect(resolveShadcnUrlSelection(react, 'html')).toMatchObject({ template: 'vite', styling: 'css' });
  });
});
