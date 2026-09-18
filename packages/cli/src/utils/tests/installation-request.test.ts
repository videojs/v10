import { describe, expect, it } from 'vite-plus/test';

import { bundledInstallationDocument, parseInstallationSlug } from '../installation-request.js';

describe('installation request routing', () => {
  it('recognizes the generic and canonical installation slugs', () => {
    expect(parseInstallationSlug('guides/installation')).toEqual({});
    expect(parseInstallationSlug('guides/installation/react')).toEqual({ method: 'packaged', framework: 'react' });
    expect(parseInstallationSlug('guides/installation/shadcn')).toEqual({ method: 'shadcn' });
    expect(parseInstallationSlug('guides/installation/cdn')).toEqual({ method: 'cdn', framework: 'html' });
  });

  it('keeps the internal content slugs as aliases', () => {
    expect(parseInstallationSlug('guides/installation-vue')).toEqual({ method: 'packaged', framework: 'vue' });
    expect(parseInstallationSlug('guides/installation-svelte')).toEqual({ method: 'packaged', framework: 'svelte' });
    expect(parseInstallationSlug('guides/installation-shadcn')).toEqual({ method: 'shadcn' });
    expect(parseInstallationSlug('guides/installation-cdn')).toEqual({ method: 'cdn', framework: 'html' });
  });

  it('maps public choices to bundled documents', () => {
    expect(bundledInstallationDocument('packaged', 'react')).toEqual({
      docsFramework: 'react',
      slug: 'guides/installation',
    });
    expect(bundledInstallationDocument('packaged', 'vue')).toEqual({
      docsFramework: 'html',
      slug: 'guides/installation-vue',
    });
    expect(bundledInstallationDocument('shadcn', 'html')).toEqual({
      docsFramework: 'html',
      slug: 'guides/installation-shadcn',
    });
  });

  it('ignores unrelated documentation slugs', () => {
    expect(parseInstallationSlug('guides/skins')).toBeNull();
    expect(parseInstallationSlug('guides/cdn')).toBeNull();
  });
});
