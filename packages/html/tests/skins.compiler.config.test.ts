import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import htmlSourceConfig, { resolveHtmlElementImports } from '../skins.compiler.config';

const canonicalRoot = resolve(import.meta.dirname, '../../skins/canonical');

describe('htmlSourceConfig', () => {
  it('lowers TimeSlider to idiomatic light-DOM element names', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.skin.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, { filename, config: htmlSourceConfig });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<media-time-slider class={slider.root}');
    expect(result.code).toContain('<media-slider-track class={slider.track}>');
    expect(result.code).toContain('<media-slider-thumbnail class={thumbnail.image}/>');
    expect(result.code).toContain('<media-icon class="size-media-icon drop-shadow-media-icon" name="spinner"/>');
    expect(result.code).not.toContain('className=');
    expect(result.code).not.toContain('@videojs/core/components');
    expect(result.code).not.toContain('@videojs/icons/components');
  });
});

describe('resolveHtmlElementImports', () => {
  it('returns exact granular element registrations for the core controls', () => {
    expect(
      resolveHtmlElementImports([
        'Controls',
        'FullscreenButton',
        'MuteButton',
        'PlayButton',
        'Popover',
        'SeekButton',
        'Slider',
        'Time',
        'TimeSlider',
        'Tooltip',
        'VolumeSlider',
      ])
    ).toEqual([
      '@videojs/html/ui/controls',
      '@videojs/html/ui/fullscreen-button',
      '@videojs/html/ui/mute-button',
      '@videojs/html/ui/play-button',
      '@videojs/html/ui/popover',
      '@videojs/html/ui/seek-button',
      '@videojs/html/ui/time',
      '@videojs/html/ui/time-slider',
      '@videojs/html/ui/tooltip',
      '@videojs/html/ui/volume-slider',
    ]);
  });
});
