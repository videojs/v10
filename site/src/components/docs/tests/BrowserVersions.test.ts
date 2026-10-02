// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vite-plus/test';

import BrowserVersions from '../BrowserVersions.astro';

async function render(feature: string, show: 'first' | 'missing'): Promise<string> {
  const container = await AstroContainer.create();

  return container.renderToString(BrowserVersions, { props: { feature, show } });
}

describe('BrowserVersions', () => {
  it('renders the first supporting versions', async () => {
    expect(await render('css-cascade-scope', 'first')).toContain('Chrome and Edge 118');
  });

  it('renders the supported versions that lack a feature', async () => {
    expect(await render('popover', 'missing')).toContain('Chrome and Edge before 114');
  });

  it('renders None when every supported version has the feature', async () => {
    expect(await render('css-has', 'missing')).toContain('>None<');
  });
});
