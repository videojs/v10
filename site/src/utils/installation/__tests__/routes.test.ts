import { describe, expect, it } from 'vite-plus/test';

import { getInstallationRoutePath, INSTALLATION_ROUTES, INSTALLATION_ROUTE_SEGMENTS } from '../routes';

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
});
