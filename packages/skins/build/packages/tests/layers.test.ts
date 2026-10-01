import { describe, expect, it } from 'vite-plus/test';

import { mediaLayers } from '../layers.ts';

describe('mediaLayers', () => {
  it('namespaces packaged layers without changing their order or declarations', () => {
    const css = mediaLayers(`
      @layer base, components, utilities;
      @layer base.theme, base.preset, base.preferences;
      @layer base { .media-skin { color: red; } }
      @layer base.preferences { .media-skin { color: blue; } }
      @media (hover: hover) {
        @layer components { .media-button { color: green; } }
      }
      @layer utilities { .media-hidden { display: none; } }
    `);

    expect(css).toContain('@layer media.base, media.components, media.utilities;');
    expect(css).toContain('@layer media.base.theme, media.base.preset, media.base.preferences;');
    expect(css).toContain('@layer media.base { .media-skin { color: red; } }');
    expect(css).toContain('@layer media.base.preferences { .media-skin { color: blue; } }');
    expect(css).toContain('@layer media.components { .media-button { color: green; } }');
    expect(css).toContain('@layer media.utilities { .media-hidden { display: none; } }');
  });
});
