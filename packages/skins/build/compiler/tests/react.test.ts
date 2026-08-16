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
  it('opts registry components into forwarded React props', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        extendComponents: true,
      }),
      configDir: dirname(filename),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('import { SeekButton as SeekButtonPrimitive } from "@videojs/react"');
    expect(result.code).toContain('import { SeekIcon } from "@videojs/react/icons"');
    expect(result.code).toContain('export interface SeekButtonProps extends Omit<SeekButtonPrimitive.Props');
    expect(result.code).toContain('resolveClassName(className, state)');
    expect(result.code).not.toContain("from '@videojs/core'");
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.tailwind');
  });

  it('does not extend packaged preset components by default', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/play-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({ style: 'tailwind', styles: await loadSkinStyleManifest(styleFiles) }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('export function PlayButton()');
    expect(result.code).not.toContain('PlayButtonProps');
    expect(result.code).not.toContain('resolveClassName');
  });

  it('keeps selected style variants out of editable component props', async () => {
    const filename = resolve(canonicalRoot, 'components/feedback/status-indicator.tsx');
    const source = await readFile(filename, 'utf8');
    const statusStyleFiles = [...styleFiles, resolve(canonicalRoot, 'styles/components/status-indicator.tailwind.ts')];
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(statusStyleFiles, { variant: 'minimal' }),
        extendComponents: true,
      }),
    });

    expect(result.code).toContain('export interface StatusIndicatorProps extends Omit<');
    expect(result.code).toContain('group/input-status pointer-events-none flex items-center gap-2 font-medium');
    expect(result.code).toContain('absolute inset-x-0 top-0 w-full justify-center');
    expect(result.code).not.toContain('variant');
    expect(result.code).not.toContain('rounded-media-pill');
  });

  it('uses public primitive props for the tooltip composition', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/button-tooltip.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        extendComponents: true,
      }),
    });

    expect(result.code).toContain('interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).toMatch(/<TooltipPrimitive\.Trigger render=\{children\}\s*\/>/);
    expect(result.code).not.toContain('Parameters<typeof TooltipPrimitive.Root>');
  });

  it('forwards VolumePopover props directly to Popover.Root', async () => {
    const filename = resolve(canonicalRoot, 'components/controls/volume-popover.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        extendComponents: true,
      }),
    });

    expect(result.code).toContain('interface VolumePopoverProps extends Popover.RootProps');
    expect(result.code).toContain('className?: Popover.PopupProps["className"]');
    expect(result.code).toContain('...props');
    expect(result.code).toContain('<Popover.Root openOnHover delay={200} closeDelay={100} side={side} {...props}>');
    expect(result.code).not.toContain('popoverProps');
  });

  it('exposes and forwards settings submenu props', async () => {
    const filename = resolve(canonicalRoot, 'components/menus/audio-track-settings-menu.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: createCompilerReactConfig({
        style: 'tailwind',
        styles: await loadSkinStyleManifest(styleFiles),
        extendComponents: true,
      }),
    });

    expect(result.code).toContain('interface AudioTrackSettingsMenuProps extends Menu.RootProps');
    expect(result.code).toContain('...props }: AudioTrackSettingsMenuProps = {}');
    expect(result.code).toContain('<Menu.Root {...props}>');
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
    expect(posterResult.code).toContain('[&[data-visible][src]:not([data-loaded])]:opacity-0');
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
    expect(result.code).not.toContain('SeekButton');
    expect(result.code).not.toContain('<Slot');
    expect(result.code).not.toContain('placeholder');
    expect(result.code).not.toContain('CSSProperties');
    expect(result.code).not.toContain('Parameters<');
  });
});
