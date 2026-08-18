import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { transform } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import { loadSkinStyleManifest } from '../../styles/manifest';
import { createCompilerReactConfig } from '../react';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/button.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/container.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/popup.tailwind.ts'),
  resolve(canonicalRoot, 'styles/components/poster.tailwind.ts'),
];

describe('createCompilerReactConfig', () => {
  it('emits canonical button composition with public React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
      configDir: dirname(filename),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain("import type { SeekButtonProps } from '@videojs/core'");
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "@videojs/react/icons"');
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.tailwind');
  });

  it('uses public primitive props for the tooltip composition', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/button-tooltip.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
    });

    expect(result.code).toContain('interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).not.toContain('Parameters<typeof TooltipPrimitive.Root>');
  });

  it('allows a projection to resolve generated React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        resolveImport(reference) {
          if (reference.source === '@videojs/react') return { ...reference, source: '@/ui/seek-button' };
          if (reference.source === '@videojs/react/icons') return { ...reference, source: '@/icons' };
          return reference;
        },
      }),
    });

    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@/ui/seek-button"');
    expect(result.code).toContain('import { SeekIcon } from "@/icons"');
  });

  it('lowers Container and Poster as independent React components', async () => {
    const filename = resolve(canonicalRoot, 'components/layout/container.tsx');
    const source = await readFile(filename, 'utf8');
    const posterFilename = resolve(canonicalRoot, 'components/layout/poster.tsx');
    const posterSource = await readFile(posterFilename, 'utf8');
    const config = createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) });
    const result = await transform(source, {
      filename,
      config,
    });
    const posterResult = await transform(posterSource, {
      filename: posterFilename,
      config,
    });

    expect(source).toContain('export function Container({ children }: { children?: unknown })');
    expect(source).not.toContain('{ children, className');
    expect(source).not.toContain('...props');
    expect(posterSource).toContain('export function Poster()');
    expect(posterSource).not.toContain('...props');
    expect(result.diagnostics).toEqual([]);
    expect(posterResult.diagnostics).toEqual([]);
    expect(result.code).toContain('export function Container(');
    expect(result.code).toContain('ContainerProps');
    expect(result.code).not.toContain('Parameters<');
    expect(result.code).toContain('<ContainerPrimitive {...props}');
    expect(posterResult.code).toContain('export function Poster(');
    expect(posterResult.code).toContain('PosterProps');
    expect(posterResult.code).not.toContain('Parameters<');
    expect(posterResult.code).toContain('<PosterPrimitive {...props}');
    expect(posterResult.code).not.toContain('Slot');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinContainer');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinPoster');
  });

  it('adds React-only inputs while keeping the canonical Skin as the composition root', async () => {
    const filename = resolve(canonicalRoot, 'skins/default-video/skin.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        rootClassName: 'media-skin media-skin-video media-theme-default',
      }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('export interface DefaultVideoSkinProps extends Omit<ContainerProps');
    expect(result.code).toContain('children?: ReactNode');
    expect(result.code).toContain('poster?: string | PosterProps["render"] | undefined');
    expect(result.code).toContain('<Container {...containerProps}');
    expect(result.code).toContain('{children}');
    expect(result.code).toContain('poster && <Poster');
    expect(result.code).not.toContain('<Slot');
    expect(result.code).not.toContain('placeholder');
    expect(result.code).not.toContain('CSSProperties');
    expect(result.code).not.toContain('Parameters<');
  });
});
