import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type CompilerConfig, transform } from 'vjsc';
import { resolveCatalogCompilerConfig } from 'vjsc/catalog';
import { loadStyleManifest, type StylePluginOptions, plugin as stylesPlugin } from 'vjsc/styles';
import { htmlOutput } from '../html';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/container.styles.ts'),
  resolve(canonicalRoot, 'styles/components/popup.styles.ts'),
  resolve(canonicalRoot, 'styles/components/poster.styles.ts'),
  resolve(canonicalRoot, 'styles/components/slider.styles.ts'),
];

type HtmlTestOptions = NonNullable<Parameters<typeof htmlOutput>[0]> & {
  styles: StylePluginOptions;
};

function htmlConfig({ styles, ...options }: HtmlTestOptions): CompilerConfig {
  const output = htmlOutput(options);
  const config = resolveCatalogCompilerConfig(output);

  return {
    ...config,
    plugins: [stylesPlugin(styles), ...(config.plugins ?? [])],
  };
}

describe('htmlOutput', () => {
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
    expect(result.code).toContain('<media-time-slider class={["group/slider relative flex');
    expect(result.code).toContain('{...props}>');
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
    expect(posterResult.code).toContain('<slot name="poster">{children}</slot>');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinContainer');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinPoster');
  });

  it('leaves adjacent popup identity wiring to the HTML runtime', async () => {
    const result = await transform(
      `import * as $ from '@videojs/core/vjsc';

export function VolumePopover() {
  return <$.Popover.Root><$.Popover.Trigger><$.MuteButton /></$.Popover.Trigger><$.Popover.Popup /></$.Popover.Root>;
}`,
      {
        config: htmlConfig({
          styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
        }),
      }
    );

    expect(result.code).toContain('<media-mute-button />');
    expect(result.code).toContain('<media-popover />');
    expect(result.code.indexOf('<media-mute-button')).toBeLessThan(result.code.indexOf('<media-popover'));
    expect(result.code).not.toContain('commandfor');
    expect(result.code).not.toContain(' id=');
  });
});
