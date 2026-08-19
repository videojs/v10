import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type CompilerConfig, transform } from 'vjsc';
import { resolveCatalogCompilerConfig } from 'vjsc/catalog';
import { loadStyleManifest, type StylePluginOptions, plugin as stylesPlugin } from 'vjsc/styles';
import { reactOutput } from '../react';

const canonicalRoot = resolve(import.meta.dirname, '../../../canonical');
const styleFiles = [
  resolve(canonicalRoot, 'styles/components/button.styles.ts'),
  resolve(canonicalRoot, 'styles/components/container.styles.ts'),
  resolve(canonicalRoot, 'styles/components/popup.styles.ts'),
  resolve(canonicalRoot, 'styles/components/poster.styles.ts'),
];

type ReactTestOptions = NonNullable<Parameters<typeof reactOutput>[0]> & {
  styles: StylePluginOptions;
};

function reactConfig({ styles, ...options }: ReactTestOptions): CompilerConfig {
  const output = reactOutput(options);
  const config = resolveCatalogCompilerConfig(output);

  return {
    ...config,
    plugins: [stylesPlugin(styles), ...(config.plugins ?? [])],
  };
}

describe('reactOutput', () => {
  it('opts registry components into forwarded React props', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
      configDir: dirname(filename),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('SeekButton as SeekButtonPrimitive');
    expect(result.code).toContain('import { SeekIcon } from "@videojs/react/icons"');
    expect(result.code).toContain('export interface SeekButtonProps extends Omit<SeekButtonPrimitive.Props');
    expect(result.code).toContain('resolveClassName(className, state)');
    expect(result.code).not.toContain("from '@videojs/core'");
    expect(result.code).toContain('<span className="tabular-nums">');
    expect(result.code).not.toContain('button.styles');
  });

  it('preserves canonical component props in packaged output', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/play-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props');
    expect(result.code).not.toContain('ComponentProps');
    expect(result.code).toContain('export function PlayButton({ className, ...props }: PlayButtonProps = {})');
    expect(result.code).toContain('resolveClassName(className, state)');
    expect(result.code).not.toContain('typeof className');
  });

  it('keeps selected style variants out of editable component props', async () => {
    const filename = resolve(canonicalRoot, 'components/feedback/status-indicator.tsx');
    const source = await readFile(filename, 'utf8');
    const statusStyleFiles = [...styleFiles, resolve(canonicalRoot, 'styles/components/status-indicator.styles.ts')];
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: {
          mode: 'tailwind',
          manifest: await loadStyleManifest(statusStyleFiles),
          variant: 'minimal',
        },
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
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.code).toContain('interface ButtonTooltipProps extends TooltipPrimitive.RootProps');
    expect(result.code).toContain('children: ReactElement');
    expect(result.code).toMatch(/<TooltipPrimitive\.Trigger render=\{children\}\s*\/>/);
    expect(result.code).not.toContain('Parameters<typeof TooltipPrimitive.Root>');
  });

  it('emits the React-only volume availability fallback', async () => {
    const filename = resolve(canonicalRoot, 'components/controls/volume-popover.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.code).toContain('interface VolumePopoverProps extends Omit<PopoverPrimitive.RootProps, "children">');
    expect(result.code).toContain('className?: PopoverPrimitive.PopupProps["className"]');
    expect(result.code).toMatch(/orientation\?: CoreVolumeSliderProps\[['"]orientation['"]\]/);
    expect(result.code).toContain('...props');
    expect(result.code).toMatch(/import \{[^}]*usePlayer[^}]*\} from "@videojs\/react"/);
    expect(result.code).toContain('const volumeAvailability = usePlayer(state => state.volumeAvailability);');
    expect(result.code).toContain(
      '<PopoverPrimitive.Root openOnHover delay={200} closeDelay={100} side={side} {...props}>'
    );
    expect(result.code).toMatch(
      /return \(?volumeAvailability === "available" \? <PopoverPrimitive\.Root[\s\S]+: <MuteButton\s*\/>/
    );
    expect(result.code).not.toContain('VolumeAvailability');
    expect(result.code).not.toContain('popoverProps');
  });

  it('exposes and forwards domain menu props through the shared submenu', async () => {
    const filename = resolve(canonicalRoot, 'components/menus/audio-track-menu.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.code).toContain('interface AudioTrackMenuProps extends Omit<SubmenuProps');
    expect(result.code).toContain('AudioTrackMenu(props: AudioTrackMenuProps = {})');
    expect(result.code).toContain('const audioTrack = useAudioTrackOptions()');
    expect(result.code).toContain('const available = audioTrack?.state.availability === "available"');
    expect(result.code).toContain('{audioTrack?.selectedLabel}');
    expect(result.code).toMatch(/<Submenu icon=.*\{\.\.\.props\}>/s);
    expect(result.code).not.toContain('MenuPrimitive.SelectedLabel');
    expect(result.code).not.toContain('AudioTrackSettingsMenu');
  });

  it('forwards submenu className to the visual menu content', async () => {
    const filename = resolve(canonicalRoot, 'components/menus/submenu.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: {
          mode: 'tailwind',
          manifest: await loadStyleManifest([
            ...styleFiles,
            resolve(canonicalRoot, 'styles/components/menu.styles.ts'),
          ]),
        },
      }),
    });

    expect(result.code).toContain('interface SubmenuProps extends MenuPrimitive.RootProps');
    expect(result.code).toContain('children?: ReactNode');
    expect(result.code).toContain('icon: ReactNode');
    expect(result.code).toContain('label: ReactNode');
    expect(result.code).toContain('selectedLabel: ReactNode');
    expect(result.code).not.toContain('MenuPrimitive.TriggerProps["children"]');
    expect(result.code).toContain('className?: MenuPrimitive.ContentProps["className"]');
    expect(result.code).toContain('<MenuPrimitive.Root {...props}>');
    expect(result.code).toContain('resolveClassName(className, state)');
  });

  it('derives the settings menu props used by the editable video composition', async () => {
    const filename = resolve(canonicalRoot, 'components/menus/video-settings-menu.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.code).toMatch(/interface VideoSettingsMenuProps extends Omit<SettingsMenuProps, ['"]children['"]>/);
    expect(result.code).toContain('const quality = useQualityOptions()');
    expect(result.code).toContain('const audioTrack = useAudioTrackOptions()');
    expect(result.code).toContain('const playbackRate = usePlaybackRateOptions()');
    expect(result.code).toContain('const captions = useCaptionsOptions()');
    expect(result.code).toContain('const hasSettings =');
    expect(result.code).toContain('hasSettings && <SettingsMenu');
  });

  it('allows settings menu props to override canonical positioning defaults', async () => {
    const filename = resolve(canonicalRoot, 'components/menus/settings-menu.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: {
          mode: 'tailwind',
          manifest: await loadStyleManifest([
            ...styleFiles,
            resolve(canonicalRoot, 'styles/components/menu.styles.ts'),
          ]),
        },
      }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('children?: ReactNode');
    expect(result.code).toContain('<MenuPrimitive.Root side="top" align="center" {...props}>');
  });

  it('allows a target to resolve generated React imports', async () => {
    const filename = resolve(canonicalRoot, 'components/buttons/seek-button.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
        resolveImport(reference) {
          if (reference.source === '@videojs/react' && reference.name === 'SeekButton') {
            return { ...reference, source: '@/ui/seek-button' };
          }
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
    const config = reactConfig({
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

    expect(source).toContain('Container({ children, className, ...props }: PropsWithChildren)');
    expect(posterSource).toContain('Poster({ children, className, src, ...props }: PropsWithChildren<CoreProps> = {})');
    expect(`${source}\n${posterSource}`).not.toContain('TargetProps');
    expect(result.diagnostics).toEqual([]);
    expect(posterResult.diagnostics).toEqual([]);
    expect(result.code).toContain('export function Container(');
    expect(result.code).toContain('ContainerProps');
    expect(result.code).not.toContain('Parameters<');
    expect(result.code).toMatch(/<ContainerPrimitive className=.*\{\.\.\.props\}>/s);
    expect(posterResult.code).toContain('export function Poster(');
    expect(posterResult.code).toContain(
      'interface PosterProps extends Omit<PosterPrimitive.Props, "children" | "render">'
    );
    expect(posterResult.code).toContain('children?: PosterPrimitive.Props["render"]');
    expect(posterResult.code).not.toContain('Parameters<');
    expect(posterResult.code).toMatch(/<PosterPrimitive render=\{children\} className=.*\{\.\.\.props\}\/>/s);
    expect(posterResult.code).toContain('[&[data-visible][src]:not([data-loaded])]:opacity-0');
    expect(posterResult.code).not.toContain('Slot');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinContainer');
    expect(`${result.code}\n${posterResult.code}`).not.toContain('SkinPoster');
  });

  it('projects the canonical Skin inputs through its React targets', async () => {
    const filename = resolve(canonicalRoot, 'skins/default-video/skin.tsx');
    const source = await readFile(filename, 'utf8');
    const result = await transform(source, {
      filename,
      config: reactConfig({
        styles: { mode: 'tailwind', manifest: await loadStyleManifest(styleFiles) },
      }),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('export interface DefaultVideoSkinProps extends Omit<ContainerProps');
    expect(result.code).toContain('children?: ReactNode');
    expect(result.code).toContain("poster?: string | PosterProps['children']");
    expect(result.code).toMatch(/<Container className=.*\{\.\.\.props\}>/s);
    expect(result.code).toContain('{children}');
    expect(result.code).toContain('<Poster src={isPosterString ? poster : undefined}');
    expect(result.code).not.toContain('SeekButton');
    expect(result.code).not.toContain('<Slot');
    expect(result.code).not.toContain('placeholder?:');
    expect(result.code).not.toContain('CSSProperties');
    expect(result.code).not.toContain('Parameters<');
  });
});
