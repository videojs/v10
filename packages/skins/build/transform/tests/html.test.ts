import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type CompilerConfig, transform } from '@videojs/compiler';
import { plugin as componentsPlugin } from '@videojs/compiler/components';
import { loadStyleManifest } from '@videojs/compiler/styles';
import { describe, expect, it } from 'vitest';
import { registry } from '../../../../html/compiler';
import { createCompilerHtmlConfig } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/container.styles.ts'),
  resolve(canonicalRoot, 'styles/components/popup.styles.ts'),
  resolve(canonicalRoot, 'styles/components/poster.styles.ts'),
  resolve(canonicalRoot, 'styles/components/slider.styles.ts'),
];

function htmlConfig(options: Parameters<typeof createCompilerHtmlConfig>[0]): CompilerConfig {
  const config = createCompilerHtmlConfig(options);

  return {
    ...config,
    plugins: [...(config.plugins ?? []), componentsPlugin(registry)],
  };
}

describe('createCompilerHtmlConfig', () => {
  it('emits idiomatic light-DOM elements', async () => {
    const filename = resolve(canonicalRoot, 'components/sliders/time-slider.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: htmlConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<media-time-slider class="group/slider relative flex');
    expect(result.code).toContain('<media-slider-thumbnail');
    expect(result.code).not.toContain('className=');
  });

  it('lowers Container and Poster as independent HTML components', async () => {
    const filename = resolve(canonicalRoot, 'components/layout/container.tsx');
    const source = await readFile(filename, 'utf8');
    const posterFilename = resolve(canonicalRoot, 'components/layout/poster.tsx');
    const posterSource = await readFile(posterFilename, 'utf8');
    const config = htmlConfig({
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
      `import * as $ from '@videojs/core/components';

export function VolumePopover() {
  return <$.Popover.Root><$.Popover.Trigger><$.MuteButton /></$.Popover.Trigger><$.Popover.Popup /></$.Popover.Root>;
}`,
      {
        config: htmlConfig({
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
