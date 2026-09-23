import { describe, expect, it } from 'vite-plus/test';

import {
  getInstallationRoutePath,
  getInstallationRouteSegment,
  INSTALLATION_ROUTES,
  INSTALLATION_ROUTE_SEGMENTS,
  isInstallationRouteSegment,
} from '../routes';

describe('installation routes', () => {
  it('defines the six public installation pages', () => {
    expect(INSTALLATION_ROUTE_SEGMENTS).toEqual(['react', 'html', 'vue', 'svelte', 'shadcn', 'cdn']);
    expect(INSTALLATION_ROUTE_SEGMENTS.map(getInstallationRoutePath)).toEqual([
      '/docs/guides/installation/react',
      '/docs/guides/installation/html',
      '/docs/guides/installation/vue',
      '/docs/guides/installation/svelte',
      '/docs/guides/installation/shadcn',
      '/docs/guides/installation/cdn',
    ]);
  });

  it('keeps supported frameworks with each source document', () => {
    expect(INSTALLATION_ROUTES.react).toMatchObject({ framework: 'react', frameworks: ['react'] });
    expect(INSTALLATION_ROUTES.vue).toMatchObject({ framework: 'html', frameworks: ['html'] });
    expect(INSTALLATION_ROUTES.shadcn).toMatchObject({
      framework: 'react',
      frameworks: ['react', 'html'],
    });
    expect(INSTALLATION_ROUTES.cdn).toMatchObject({ framework: 'html', frameworks: ['html'] });
  });

  it('validates installation route segments', () => {
    expect(isInstallationRouteSegment('shadcn')).toBe(true);
    expect(isInstallationRouteSegment('angular')).toBe(false);
    expect(isInstallationRouteSegment(undefined)).toBe(false);
  });

  it('parses HTML and Markdown installation paths through the same route table', () => {
    expect(getInstallationRouteSegment('/docs/guides/installation/shadcn')).toBe('shadcn');
    expect(getInstallationRouteSegment('/docs/guides/installation/shadcn.md')).toBe('shadcn');
    expect(getInstallationRouteSegment('/docs/guides/installation/shadcn/')).toBe('shadcn');
    expect(getInstallationRouteSegment('/docs/guides/installation')).toBeNull();
    expect(getInstallationRouteSegment('/docs/guides/cdn')).toBeNull();
  });
});
