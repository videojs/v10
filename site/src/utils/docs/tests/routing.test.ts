import { describe, expect, it } from 'vitest';

import { buildAgnosticDocsUrl, resolveDocsHref } from '../routing';

describe('buildAgnosticDocsUrl', () => {
  it('points at the docs landing page without a slug', () => {
    expect(buildAgnosticDocsUrl()).toBe('/docs');
    expect(buildAgnosticDocsUrl(null)).toBe('/docs');
  });

  it('uses the preference-aware installation landing page', () => {
    expect(buildAgnosticDocsUrl('guides/installation')).toBe('/docs/guides/installation');
  });
});

describe('resolveDocsHref', () => {
  it('returns the agnostic URL when no framework is known', () => {
    expect(resolveDocsHref({ slug: null, framework: null })).toBe('/docs');
    expect(resolveDocsHref({ slug: 'guides/installation', framework: null })).toBe('/docs/guides/installation');
  });

  it('resolves the first guide for a framework without a slug', () => {
    expect(resolveDocsHref({ slug: null, framework: 'html' })).toBe('/docs/guides/installation/html');
  });

  it('keeps the slug when the guide exists for the framework', () => {
    expect(resolveDocsHref({ slug: 'guides/installation', framework: 'react' })).toBe(
      '/docs/guides/installation/react'
    );
  });

  it('uses the canonical Shadcn and CDN installation routes', () => {
    expect(resolveDocsHref({ slug: 'guides/installation-shadcn', framework: 'react' })).toBe(
      '/docs/guides/installation/shadcn'
    );
    expect(resolveDocsHref({ slug: 'guides/cdn', framework: 'html' })).toBe('/docs/guides/installation/cdn');
  });

  it('throws for an unknown guide slug', () => {
    expect(() => resolveDocsHref({ slug: 'guides/does-not-exist', framework: 'html' })).toThrow(/No guide found/);
  });
});
