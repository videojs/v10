import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadDesignSystem } from '../design-system';

const designPath = resolve(import.meta.dirname, 'fixtures/tailwind.css');

describe('loadDesignSystem', () => {
  it('memoizes compiled CSS by source', async () => {
    const design = await loadDesignSystem(designPath);
    const source = '.media-button {\n  @apply grid;\n}';
    const first = design.compileCss(source);

    expect(design.compileCss(source)).toBe(first);
    expect(await first).toContain('.media-button');
    expect(design.compileCss('.media-icon {\n  @apply grid;\n}')).not.toBe(first);
  });
});
