import { resolve } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadDesignSystem } from '../design-system';

const designPath = resolve(import.meta.dirname, 'fixtures/tailwind.css');

describe('loadDesignSystem', () => {
  it('derives merge groups from imported theme tokens', async () => {
    const design = await loadDesignSystem(resolve(import.meta.dirname, '../../plugins/tests/fixtures/design.css'));

    expect(design.merge('text-fixture-title font-medium text-fixture-foreground font-normal')).toBe(
      'text-fixture-title text-fixture-foreground font-normal'
    );
    expect(design.merge('text-sm text-fixture-title')).toBe('text-fixture-title');
    expect(design.merge('text-fixture-title text-sm')).toBe('text-sm');
    expect(design.watchFiles).toContain(resolve(import.meta.dirname, '../../plugins/tests/fixtures/theme.css'));
  });

  it('memoizes compiled CSS by source', async () => {
    const design = await loadDesignSystem(designPath);
    const source = '.media-button {\n  @apply grid;\n}';
    const first = design.compileCss(source);

    expect(design.compileCss(source)).toBe(first);
    expect(await first).toContain('.media-button');
    expect(design.compileCss('.media-icon {\n  @apply grid;\n}')).not.toBe(first);
  });
});
