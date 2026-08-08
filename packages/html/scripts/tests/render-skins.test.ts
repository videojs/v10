import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSkinSource, renderSkinSourceOutput } from '../render-skins';

const canonicalRoot = resolve(import.meta.dirname, '../../../skins/canonical');

describe('renderSkinSource', () => {
  it('renders canonical composition to static light-DOM custom elements', async () => {
    const html = await renderSkinSource(resolve(canonicalRoot, 'skins/default/video-controls.skin.tsx'));

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
    const output = await renderSkinSourceOutput(resolve(canonicalRoot, 'skins/default/video-controls.skin.tsx'), {
      style: 'css',
      tailwindInput: resolve(canonicalRoot, 'styles/tailwind.css'),
    });

    expect(output.html).toContain('class="media-video-controls media-skin media-theme-default"');
    expect(output.html).not.toContain('grid size-media-control');
    expect(output.css).toContain('.media-video-controls {');
    expect(output.css).toContain('.media-play-button {');
    expect(output.css.match(/tailwindcss v/g)).toHaveLength(1);
    expect(output.css.match(/@layer properties\s*\{/g)).toHaveLength(1);
  });
});
