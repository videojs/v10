import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSkinSource, renderSkinSourceOutput } from '../render-skins';

const canonicalRoot = resolve(import.meta.dirname, '../../../skins/canonical');

describe('renderSkinSource', () => {
  it('renders canonical composition to static light-DOM custom elements', async () => {
    const html = await renderSkinSource(resolve(canonicalRoot, 'skins/default-video/skin.tsx'));

    expect(html).toContain('<media-controls');
    expect(html).toContain('<media-play-button');
    expect(html).toContain('<media-seek-button');
    expect(html).toContain('seconds="-10"');
    expect(html).toContain('seconds="10"');
    expect(html).toContain('thumb-alignment="edge"');
    expect(html).not.toContain('thumbAlignment');
    expect(html).not.toMatch(/class="[^"]*,/);
    expect(html).not.toContain('commandfor=');
    expect(html).not.toMatch(/ id=/);
  });

  it('renders semantic markup and vanilla CSS from the same composition', async () => {
    const output = await renderSkinSourceOutput(resolve(canonicalRoot, 'skins/default-video/skin.tsx'), {
      style: 'css',
      tailwindInput: resolve(canonicalRoot, 'styles/tailwind.css'),
    });

    expect(output.html).toContain('class="media-skin media-theme-default"');
    expect(output.html).not.toContain('grid size-media-control');
    expect(output.css).toContain('.media-skin {');
    expect(output.css).toContain('.media-play-button {');
    expect(output.css).not.toContain('--tw-');
    expect(output.css).not.toContain('@layer properties');
  });
});
