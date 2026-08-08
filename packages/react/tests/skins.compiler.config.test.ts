import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import reactSourceConfig, { createReactSkinSourceConfig } from '../skins.compiler.config';

const canonicalRoot = resolve(import.meta.dirname, '../../skins/canonical');
const generatedRoot = resolve(import.meta.dirname, '../generated/skins');

async function compileCanonical(relativePath: string) {
  const filename = resolve(canonicalRoot, relativePath);
  const source = await readFile(filename, 'utf8');
  const outputFile = resolve(generatedRoot, relativePath);
  return compile(source, {
    filename,
    config: reactSourceConfig,
    configDir: dirname(outputFile),
    outputFile,
  });
}

describe('reactSourceConfig', () => {
  it('emits canonical button composition with public React imports', async () => {
    const result = await compileCanonical('components/buttons/seek-button.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toMatch(/import type \{ SeekButtonProps \} from ['"]@videojs\/core['"]/);
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "./icons"');
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.tailwind');
    expect(result.code).not.toContain('@videojs/core/components');
    expect(result.code).not.toContain('@videojs/icons/components');
  });

  it('emits button tooltip children as the React render prop', async () => {
    const result = await compileCanonical('components/buttons/button-tooltip.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('from "@videojs/react"');
    expect(result.code).toContain('import type { ReactElement } from "react"');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).toContain('<TooltipPrimitive.Trigger render={children}/>');
    expect(result.code).not.toContain('<TooltipPrimitive.Trigger>{children}</TooltipPrimitive.Trigger>');
  });

  it('emits target-owned thumbnail markup and class values', async () => {
    const result = await compileCanonical('components/sliders/time-slider.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<div className="bg-media-surface');
    expect(result.code).toContain('<Slider.Thumbnail className="block max-h-28 max-w-48"/>');
    expect(result.code).not.toContain('Slider.Thumbnail.Root');
    expect(result.code).not.toContain('Slider.Thumbnail.Image');
  });

  it('keeps public core prop types separate from React component imports', async () => {
    const result = await compileCanonical('components/sliders/volume-slider.skin.tsx');

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toMatch(/import type \{ VolumeSliderProps \} from ['"]@videojs\/core['"]/);
    expect(result.code).toContain('import { VolumeSlider as VolumeSliderPrimitive } from "@videojs/react"');
  });

  it('extracts semantic classes and CSS for the vanilla target', async () => {
    const relativePath = 'components/buttons/play-button.skin.tsx';
    const filename = resolve(canonicalRoot, relativePath);
    const source = await readFile(filename, 'utf8');
    const result = await compile(source, {
      filename,
      config: createReactSkinSourceConfig({
        style: 'css',
        tailwindInput: resolve(canonicalRoot, 'styles/tailwind.css'),
      }),
      configDir: dirname(resolve(generatedRoot, relativePath)),
      outputFile: resolve(generatedRoot, relativePath),
    });

    expect(result.code).toContain('className="media-button-play"');
    expect(result.code).not.toContain('grid size-media-control');
    expect(result.assets[0]?.source).toContain('.media-button-play {');
  });
});
