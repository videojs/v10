import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { emitShadcnRegistry } from 'vjsc/shadcn';
import { skinRegistry } from '../../../canonical/registry/shadcn';
import { loadSkinCatalog } from '../../catalog';
import { reactOutput } from '../react';

describe('emitShadcnRegistry', () => {
  it('emits individual React/Tailwind components and a shadcn source manifest', async () => {
    const catalog = await loadSkinCatalog();
    const output = await emitShadcnRegistry(catalog, skinRegistry, {
      output: reactOutput({
        resolveImport(reference) {
          if (reference.source === '@videojs/utils/style' || reference.source === '@videojs/skins/registry') {
            return { ...reference, source: `${skinRegistry.paths.import}/utils` };
          }

          return reference;
        },
      }),
      styles: { mode: 'tailwind', variant: 'default' },
    });
    const entry = output.files.find((file) => file.path.endsWith('/play-button/play-button.tsx'));
    const posterEntry = output.files.find((file) => file.path.endsWith('/poster/poster.tsx'));
    const containerEntry = output.files.find((file) => file.path.endsWith('/container/container.tsx'));
    const overlayEntry = output.files.find((file) => file.path.endsWith('/overlay/overlay.tsx'));
    const skinEntry = output.files.find((file) => file.path.endsWith('/skin.tsx'));
    const registry = output.registry;
    const playButton = registry.items.find((item) => item.name === 'play-button');
    const publicComponentProps = {
      'airplay-button': 'AirPlayButtonProps',
      'buffering-indicator': 'BufferingIndicatorProps',
      'captions-button': 'CaptionsButtonProps',
      'cast-button': 'CastButtonProps',
      container: 'ContainerProps',
      'error-dialog': 'ErrorDialogProps',
      'fullscreen-button': 'FullscreenButtonProps',
      overlay: 'OverlayProps',
      'pip-button': 'PiPButtonProps',
      'play-button': 'PlayButtonProps',
      poster: 'PosterProps',
      'seek-button': 'SeekButtonProps',
      'seek-indicator': 'SeekIndicatorProps',
      'status-announcer': 'StatusAnnouncerProps',
      'status-indicator': 'StatusIndicatorProps',
      'time-slider': 'TimeSliderProps',
      'volume-indicator': 'VolumeIndicatorProps',
      'volume-popover': 'VolumePopoverProps',
      'volume-slider': 'VolumeSliderProps',
    } as const;

    expect(entry?.content).not.toContain('styles/tailwind.css');
    expect(skinEntry?.content).toMatch(/["']media-skin media-skin-video media-theme-default["']/);
    expect(skinEntry?.content).toContain('className={cn(');
    expect(skinEntry?.content).not.toContain('cnPrimitive');
    expect(posterEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).not.toContain('/poster/poster');
    expect(overlayEntry?.content).toContain('export interface OverlayProps extends Omit<ComponentProps<"div">');
    expect(overlayEntry?.content).toContain('<div className={cn(');
    expect(overlayEntry?.content).toContain('{...props}/>');
    expect(entry?.content).toMatch(/from ["']@\/components\/videojs\/button-tooltip\/button-tooltip["']/);
    expect(entry?.content).toContain('grid min-h-0');
    expect(entry?.content).toContain('size-9');
    expect(entry?.content).toContain('export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props');
    expect(entry?.content).toContain('<PlayButtonPrimitive className=');
    expect(entry?.content).toContain('{...props}>');
    expect(entry?.content).toContain('resolveClassName(className, state)');
    expect(playButton?.files?.some((file) => file.path.endsWith('/play-button/play-button.tsx'))).toBe(true);
    expect(playButton?.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(playButton?.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton?.meta).toEqual({
      framework: 'react',
      style: 'tailwind',
      skin: 'default-video',
    });
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/play-button'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/container'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/overlay'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).toContain(
      '@videojs/poster'
    );
    expect(registry.items.find((item) => item.name === 'default-video')?.registryDependencies).not.toContain(
      '@videojs/seek-button'
    );
    expect(registry.items.find((item) => item.name === 'seek-button')).toBeDefined();
    expect(registry.items.find((item) => item.name === 'container')?.dependencies).toEqual(['@videojs/react', 'react']);
    expect(registry.items.find((item) => item.name === 'container')?.registryDependencies).toEqual([
      '@videojs/styles',
      '@videojs/utils',
    ]);
    expect(registry.items.some((item) => item.name === 'button-tooltip')).toBe(false);
    const styleItem = registry.items.find((item) => item.name === 'styles');
    expect(styleItem?.type).toBe('registry:style');
    expect(styleItem?.files?.map((file) => file.target)).toEqual([
      'components/videojs/styles/base.css',
      'components/videojs/styles/captions.css',
      'components/videojs/styles/tailwind.css',
      'components/videojs/styles/tailwind.shared.css',
      'components/videojs/styles/themes/default.css',
      'components/videojs/styles/themes/minimal.css',
      'components/videojs/styles/themes/video.css',
    ]);
    const utilityItem = registry.items.find((item) => item.name === 'utils');
    expect(utilityItem?.type).toBe('registry:lib');
    expect(utilityItem?.files?.map((file) => file.target)).toEqual(['components/videojs/utils.ts']);
    expect(output.files.find((file) => file.path.endsWith('/utils.ts'))?.content).toContain(
      'export function resolveClassName'
    );
    expect(utilityItem?.files?.[0]?.type).toBe('registry:lib');
    expect(utilityItem?.dependencies).toEqual(['clsx', 'tailwind-merge']);
    const errorDialog = registry.items.find((item) => item.name === 'error-dialog');
    expect(errorDialog?.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    for (const [itemName, propsName] of Object.entries(publicComponentProps)) {
      const source = output.files.find((file) => file.path.endsWith(`/${itemName}/${itemName}.tsx`))?.content;
      expect(source, itemName).toContain(`export interface ${propsName}`);
      expect(source, itemName).toContain('className');
      expect(registry.items.find((item) => item.name === itemName)?.registryDependencies, itemName).toContain(
        '@videojs/utils'
      );
    }
    const generatedSources = new Map(
      output.files
        .filter((file) => file.kind === 'source' && file.path.endsWith('.tsx'))
        .map((file) => [file.path, file.content])
    );
    for (const [fileName, content] of generatedSources) {
      const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const statement of source.statements) {
        if (!ts.isFunctionDeclaration(statement) || !statement.name || !hasExportModifier(statement)) continue;
        const componentName = statement.name.text;
        const propsName = `${componentName}Props`;
        const props = source.statements.find(
          (candidate): candidate is ts.InterfaceDeclaration =>
            ts.isInterfaceDeclaration(candidate) && candidate.name.text === propsName && hasExportModifier(candidate)
        );
        expect(props, `${fileName} must export ${propsName}`).toBeDefined();
        expect(statement.parameters[0]?.type?.getText(source), `${componentName} must accept ${propsName}`).toBe(
          propsName
        );
      }
    }
    expect(playButton?.files?.some((file) => file.target?.includes('/styles/'))).toBe(false);
    const tailwind = output.files.find((file) => file.path.endsWith('/styles/tailwind.css'));
    expect(tailwind?.content).not.toContain('--spacing: var(--media-spacing)');
    expect(tailwind?.content).toContain('@import "tailwindcss";');
    expect(tailwind?.content).not.toContain('theme(inline)');
    const tailwindShared = output.files.find((file) => file.path.endsWith('/styles/tailwind.shared.css'));
    expect(tailwindShared?.content).toContain('@theme inline {');
  });
});

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  );
}
