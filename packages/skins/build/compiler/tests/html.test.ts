import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { loadSkinStyleManifest } from '../../styles/manifest';
import { createCompilerHtmlConfig, finalizeCompilerHtml, resolveHtmlElementImports } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/popup.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/slider.tailwind.ts'),
];

describe('createCompilerHtmlConfig', () => {
  it('emits idiomatic light-DOM elements', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, {
      filename,
      config: createCompilerHtmlConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
    });

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

  it('connects popup relationships after the full component tree is composed', () => {
    const source = `<div>
  <media-play-button></media-play-button>
  <media-tooltip></media-tooltip>
  <media-seek-button seconds="-10"></media-seek-button>
  <media-tooltip></media-tooltip>
  <media-mute-button></media-mute-button>
  <media-popover></media-popover>
</div>`;

    const output = finalizeCompilerHtml(source);
    expect(output).toContain('<media-play-button commandfor="play-tooltip"></media-play-button>');
    expect(output).toContain('<media-tooltip id="play-tooltip"></media-tooltip>');
    expect(output).toContain('commandfor="seek-backward-tooltip"');
    expect(output).toContain('id="volume-popover"');
  });
});
