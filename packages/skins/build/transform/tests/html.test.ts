import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transform } from '@videojs/compiler';
import { loadStyleManifest } from '@videojs/compiler/styles';
import { describe, expect, it } from 'vitest';
import { createCompilerHtmlConfig, resolveHtmlElementImports } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/container.styles.ts'),
  resolve(canonicalRoot, 'styles/components/popup.styles.ts'),
  resolve(canonicalRoot, 'styles/components/poster.styles.ts'),
  resolve(canonicalRoot, 'styles/components/slider.styles.ts'),
];

describe('createCompilerHtmlConfig', () => {
  it('emits idiomatic light-DOM elements', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerHtmlConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
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
      '@videojs/html/ui/time-slider-chapters',
      '@videojs/html/ui/tooltip',
      '@videojs/html/ui/tooltip-group',
    ]);
  });

  it('maps Skin-owned container markup to exact element registration modules', () => {
    expect(resolveHtmlElementImports([], '<media-container><media-poster></media-poster></media-container>')).toEqual([
      '@videojs/html/media/container',
      '@videojs/html/ui/poster',
    ]);
  });

  it('lowers Container and Poster as independent HTML components', async () => {
    const filename = resolve(canonicalRoot, 'components/layout/container.tsx');
    const source = await readFile(filename, 'utf8');
    const posterFilename = resolve(canonicalRoot, 'components/layout/poster.tsx');
    const posterSource = await readFile(posterFilename, 'utf8');
    const config = createCompilerHtmlConfig({
      styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
    });
    const result = await transform(source, {
      filename,
      config,
    });
    const posterResult = await transform(posterSource, {
      filename: posterFilename,
      config,
    });

    expect(result.diagnostics).toEqual([]);
    expect(posterResult.diagnostics).toEqual([]);
    expect(result.code).toContain('<media-container');
    expect(result.code).toContain('{children}');
    expect(posterResult.code).toContain('<media-poster');
    expect(posterResult.code).toContain('[&[data-visible][src]:not([data-loaded])]:opacity-0');
    expect(posterResult.code).toContain('<slot name="poster"/>');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinContainer');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinPoster');
  });

  it('leaves adjacent popup identity wiring to the HTML runtime', async () => {
    const result = await transform(
      `export function VolumePopover() {
  return <Popover.Root><Popover.Trigger><MuteButtonPrimitive /></Popover.Trigger><Popover.Popup /></Popover.Root>;
}`,
      {
        config: createCompilerHtmlConfig({
          styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
        }),
      }
    );

    expect(result.code).toContain('<media-mute-button {...props}/>');
    expect(result.code).toContain('<media-popover />');
    expect(result.code.indexOf('<media-mute-button')).toBeLessThan(result.code.indexOf('<media-popover'));
    expect(result.code).not.toContain('commandfor');
    expect(result.code).not.toContain(' id=');
  });
});
