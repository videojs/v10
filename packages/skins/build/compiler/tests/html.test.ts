import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transform } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { loadSkinStyleManifest } from '../../styles/manifest';
import { createCompilerHtmlConfig, resolveHtmlElementImports } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/popup.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/slider.tailwind.ts'),
];

describe('createCompilerHtmlConfig', () => {
  it('emits idiomatic light-DOM elements', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
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

  it('connects tooltip relationships in JSX before HTML rendering', async () => {
    const result = await transform(
      `export function PlayButton() {
  return <ButtonTooltip><PlayButtonPrimitive /></ButtonTooltip>;
}`,
      {
        config: createCompilerHtmlConfig({
          style: 'tailwind',
          styles: await loadSkinStyleManifest(styleFiles),
        }),
      }
    );

    expect(result.code).toContain('<ButtonTooltip id={"play-tooltip"}>');
    expect(result.code).toContain('<media-play-button commandfor={"play-tooltip"}/>');
  });

  it('rejects conflicting tooltip relationships in JSX', async () => {
    await expect(
      transform(`<ButtonTooltip id="play-tooltip"><PlayButtonPrimitive commandfor="other" /></ButtonTooltip>`, {
        config: createCompilerHtmlConfig({
          style: 'tailwind',
          styles: await loadSkinStyleManifest(styleFiles),
        }),
      })
    ).rejects.toThrow('HTML trigger targets `other`, but its popup is identified by `play-tooltip`.');
  });
});
