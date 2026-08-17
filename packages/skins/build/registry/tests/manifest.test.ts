import { resolveCatalog } from '@videojs/compiler/catalog';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { skinRegistry } from '../../../canonical/registry/config';
import { canonicalRoot, loadSkinCatalog } from '../../catalog';
import { createRegistryManifest } from '../manifest';
import { generateReactRegistry } from '../source';

describe('generateReactRegistry', () => {
  it('emits individual React/Tailwind components and a shadcn source manifest', async () => {
    const catalog = await loadSkinCatalog();
    const output = await generateReactRegistry(catalog, {
      rootDir: canonicalRoot,
      sourceRoot: skinRegistry.sourceRoot,
      itemNames: [
        ...new Set([
          ...resolveCatalog(catalog, [skinRegistry.skin]).items.map((item) => item.name),
          ...skinRegistry.items,
        ]),
      ],
      utility: {
        source: skinRegistry.utilityItem.source,
        target: skinRegistry.utilityItem.target,
        importSource: `@/${skinRegistry.installRoot}/utils`,
      },
    });
    const entry = output.items['play-button']?.files.find((file) => file.path.endsWith('/play-button.tsx'));
    const posterEntry = output.items.poster?.files.find((file) => file.path.endsWith('/poster.tsx'));
    const containerEntry = output.items.container?.files.find((file) => file.path.endsWith('/container.tsx'));
    const overlayEntry = output.items.overlay?.files.find((file) => file.path.endsWith('/overlay.tsx'));
    const registry = createRegistryManifest(catalog, output, skinRegistry);
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
    expect(posterEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).toMatch(/from ["']@videojs\/react["']/);
    expect(containerEntry?.content).not.toContain('/poster/poster');
    expect(overlayEntry?.content).toContain('export interface OverlayProps extends Omit<ComponentProps<"div">');
    expect(overlayEntry?.content).toContain('<div {...props} className={cn(');
    expect(entry?.content).toMatch(/from ["']@\/components\/videojs\/button-tooltip\/button-tooltip["']/);
    expect(entry?.content).toContain('grid min-h-0');
    expect(entry?.content).toContain('size-9');
    expect(entry?.content).toContain('export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props');
    expect(entry?.content).toContain('<PlayButtonPrimitive {...props}');
    expect(entry?.content).toContain('resolveClassName(className, state)');
    expect(playButton?.files?.some((file) => file.path.endsWith('/play-button/play-button.tsx'))).toBe(true);
    expect(playButton?.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(playButton?.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton?.meta).toEqual({
      framework: 'react',
      style: 'tailwind',
      skin: skinRegistry.skin,
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
    expect(registry.items.find((item) => item.name === 'container')?.dependencies).toEqual(['@videojs/react']);
    expect(registry.items.find((item) => item.name === 'container')?.registryDependencies).toEqual([
      '@videojs/styles',
      '@videojs/utils',
    ]);
    expect(registry.items.some((item) => item.name === 'button-tooltip')).toBe(false);
    const styleItem = registry.items.find((item) => item.name === skinRegistry.styleItem.name);
    expect(styleItem?.type).toBe('registry:style');
    expect(styleItem?.files?.map((file) => file.target)).toEqual([
      'components/videojs/styles/base.css',
      'components/videojs/styles/captions.css',
      'components/videojs/styles/tailwind.css',
      'components/videojs/styles/themes/default.css',
      'components/videojs/styles/themes/minimal.css',
      'components/videojs/styles/themes/video.css',
    ]);
    const utilityItem = registry.items.find((item) => item.name === skinRegistry.utilityItem.name);
    expect(utilityItem?.type).toBe('registry:lib');
    expect(utilityItem?.files?.map((file) => file.target)).toEqual(['components/videojs/utils.ts']);
    expect(output.utilityFiles[0]?.content).toContain('export function resolveClassName');
    expect(utilityItem?.files?.[0]?.type).toBe('registry:lib');
    expect(utilityItem?.dependencies).toEqual(['clsx', 'tailwind-merge']);
    const errorDialog = registry.items.find((item) => item.name === 'error-dialog');
    expect(errorDialog?.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    for (const [itemName, propsName] of Object.entries(publicComponentProps)) {
      const source = output.items[itemName]?.files.find((file) => file.path.endsWith(`/${itemName}.tsx`))?.content;
      expect(source, itemName).toContain(`export interface ${propsName}`);
      expect(source, itemName).toContain('className');
      expect(registry.items.find((item) => item.name === itemName)?.registryDependencies, itemName).toContain(
        '@videojs/utils'
      );
    }
    const generatedSources = new Map(
      Object.values(output.items)
        .flatMap((item) => item.files)
        .filter((file) => file.kind === 'source')
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
    const tailwind = output.sharedFiles.find((file) => file.path.endsWith('/styles/tailwind.css'));
    expect(tailwind?.content).not.toContain('--spacing: var(--media-spacing)');
    expect(tailwind?.content).toContain('@import "tailwindcss";');
    expect(tailwind?.content).not.toContain('theme(inline)');
    expect(tailwind?.content).toContain('@theme inline {');
  });
});

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  );
}
