import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { createHtmlSkinSourceConfig, resolveHtmlElementImports } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');

describe('createHtmlSkinSourceConfig', () => {
  it('emits idiomatic light-DOM elements', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, { filename, config: createHtmlSkinSourceConfig({ style: 'tailwind' }) });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<media-time-slider class={cn("group/slider relative flex');
    expect(result.code).toContain('<media-slider-thumbnail');
    expect(result.code).not.toContain('className=');
  });

  it('maps component symbols to exact element registration modules', () => {
    expect(resolveHtmlElementImports(['Controls', 'PlayButton', 'Slider', 'TimeSlider', 'Tooltip'])).toEqual([
      '@videojs/html/ui/controls',
      '@videojs/html/ui/play-button',
      '@videojs/html/ui/time-slider',
      '@videojs/html/ui/tooltip',
      '@videojs/html/ui/tooltip-group',
    ]);
  });
});
