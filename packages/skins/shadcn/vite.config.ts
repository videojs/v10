import { basename, relative, resolve } from 'node:path';

import type { Plugin } from 'vite';
import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { baseConfig } from '../../../build/pack.ts';
// Vite+ loads this config before it can schedule builds, so bootstrap the private compiler from source.
import type { ComponentGraph, ComponentGraphModule } from '../../vjsc/src/graph/index.ts';
import {
  componentGraphPlugin,
  shadcnRegistryPlugin,
  type VjscModule,
  type VjscModuleConfig,
  vjscPlugin,
} from '../../vjsc/src/plugins/index.ts';
import type { VjscRegistryItem } from '../../vjsc/src/shadcn/index.ts';
import type { VideojsRegistryMeta } from '../registry/meta.ts';
import { configureSkinModule } from '../vjsc/config';
import { type SkinModuleMeta, type SkinName, skinStyles } from '../vjsc/meta';

const packageDir = resolve(import.meta.dirname, '..');
const vjscDir = resolve(packageDir, 'vjsc');
const registryUtils = resolve(vjscDir, 'utils.ts');
const privateComponents = new Set(['button-tooltip']);
const privateModules = new Map([['components/menus/menu-chevron.tsx', '_menu-chevron']]);
const styleTargets = {
  'buttons.css': 'styles/button.css',
  'container.css': 'styles/container.css',
  'dialog.css': 'styles/dialog.css',
  'indicators.css': 'styles/indicator.css',
  'menus.css': 'styles/menu.css',
  'popups.css': 'styles/popup.css',
  'poster.css': 'styles/poster.css',
  'sliders.css': 'styles/slider.css',
} as const;
const tailwindThemeVariables = {
  'color-media-accent': 'var(--media-primary)',
  'color-media-accent-text': 'var(--media-accent-foreground)',
  'color-media-background': 'var(--media-background)',
  'color-media-border': 'var(--media-border)',
  'color-media-control-hover': 'var(--media-accent)',
  'color-media-controls': 'var(--media-controls)',
  'color-media-controls-foreground': 'var(--media-controls-foreground)',
  'color-media-foreground': 'var(--media-foreground)',
  'color-media-muted': 'var(--media-muted)',
  'color-media-muted-foreground': 'var(--media-muted-foreground)',
  'color-media-popover': 'var(--media-popover)',
  'color-media-popover-foreground': 'var(--media-popover-foreground)',
  'color-media-primary': 'var(--media-primary)',
  'color-media-primary-foreground': 'var(--media-primary-foreground)',
  'color-media-ring': 'var(--media-ring)',
  'font-media': '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
  'text-media-xs': '0.7em',
  'text-media-sm': 'calc(var(--media-spacing) * 2.75)',
  'text-media': 'calc(var(--media-spacing) * 3.25)',
  'text-media-lg': 'calc(var(--media-spacing) * 3.75)',
  'spacing-media-icon': 'var(--media-icon-size, calc(var(--media-spacing) * 4.5))',
  'spacing-media-icon-lg': 'calc(var(--media-icon-size, calc(var(--media-spacing) * 4.5)) * 1.5)',
  'spacing-media-icon-xl': 'calc(var(--media-icon-size, calc(var(--media-spacing) * 4.5)) * 2)',
  'spacing-media-control': 'var(--media-control-size)',
  'radius-media-control': 'var(--media-control-radius)',
} as const;
const tailwindRegistryCss = {
  '@custom-variant theme-default (&:where(.media-skin:not(.media-skin--minimal), .media-skin:not(.media-skin--minimal) *))':
    {},
  '@custom-variant theme-minimal (&:where(.media-skin--minimal, .media-skin--minimal *))': {},
  '@utility shadow-media-sm': {
    'box-shadow': 'var(--media-shadow-sm)',
  },
} as const;
const registryPaths = {
  install: '@components/videojs',
  import: '@/components/videojs',
} as const;
const publishedSkins = Object.keys(skinStyles).filter(isSkinName);
const registryTargets = [
  { framework: 'react', styling: 'tailwind', output: 'r/react' },
  { framework: 'react', styling: 'css', output: 'r/react/css' },
  { framework: 'html', styling: 'tailwind', output: 'r/html' },
  { framework: 'html', styling: 'css', output: 'r/html/css' },
] as const satisfies readonly RegistryTarget[];

interface RegistryTarget {
  readonly framework: 'html' | 'react';
  readonly styling: 'css' | 'tailwind';
  readonly output: string;
}

const graph = componentGraphPlugin<SkinModuleMeta>({
  root: vjscDir,
  include: ['./components/**/*.tsx', './skins/**/skin.tsx', './utils.ts'],
  transformations(module) {
    if (module.filename === registryUtils) {
      return [{}];
    }

    const ownedSkin = publishedSkins.find((name) => module.filename.includes(`/skins/${name}/`));

    if (ownedSkin) {
      return registryTargets.map(({ framework, styling }) => ({ target: framework, skin: ownedSkin, style: styling }));
    }

    return registryTargets
      .filter(({ framework }) => framework === 'react')
      .map(({ framework, styling }) => ({ target: framework, style: styling }));
  },
});

export const shadcnPackConfig: PackUserConfig = {
  ...baseConfig,
  name: 'skins-shadcn-registry',
  cwd: packageDir,
  entry: { registry: registryUtils },
  outDir: 'dist/registry',
  clean: true,
  dts: false,
  sourcemap: false,
  platform: 'browser',
  format: 'es',
  deps: {
    neverBundle: true,
    onlyBundle: false,
  },
  plugins: [
    vjscPlugin({ configure: configureRegistryModule }),
    graph,
    ...registryTargets.map((target) =>
      shadcnRegistryPlugin(graph, {
        name: 'videojs',
        homepage: 'https://videojs.org',
        namespace: '@videojs',
        output: target.output,
        paths: registryPaths,
        imports: {
          '@videojs/utils/style': `${registryPaths.import}/lib/resolve-class-name`,
        },
        packages: {
          '@videojs/core': '@videojs/core@10.0.0-beta.32',
          '@videojs/html': '@videojs/html@10.0.0-beta.32',
          '@videojs/react': '@videojs/react@10.0.0-beta.32',
        },
        meta: { framework: target.framework, style: target.styling },
        items: registryItems(target),
      })
    ),
    registryAssetsOnly(),
  ],
};

export default defineConfig({
  pack: shadcnPackConfig,
});

function registryItems(
  target: RegistryTarget
): (graph: ComponentGraph<SkinModuleMeta>) => readonly VjscRegistryItem<SkinModuleMeta>[] {
  return (graph) => {
    const modules = [...graph.modules.values()];
    const items = modules.flatMap((module) => {
      if (module.filename === registryUtils) return target.framework === 'react' ? [utilsItem(module, target)] : [];

      if (module.transform.target !== target.framework || module.transform.style !== target.styling) return [];

      const meta = module.meta;
      if (meta?.type === 'skin') return module.transform.skin === meta.name ? [skinItem(module, meta, target)] : [];

      if (meta?.type === 'component' && target.framework === 'react') {
        if (module.transform.skin !== undefined) return [];

        return privateComponents.has(meta.name)
          ? [privateComponentItem(module, meta, target, graph)]
          : [componentItem(module, meta, target, graph)];
      }

      if (target.framework === 'react' && module.transform.skin === undefined) {
        const sourcePath = moduleSourcePath(module);
        const privateName = privateModules.get(sourcePath);

        return privateName ? [privateModuleItem(module, privateName, target, graph)] : [];
      }

      return [];
    });

    return [...items, themeStyleItem(target), ...concernStyleItems(modules, target)];
  };
}

function privateComponentItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const styles = sourceStyles(module, target, graph);

  return {
    name: `_${meta.name}`,
    type: 'registry:lib',
    title: meta.title,
    description: `Private ${meta.description.charAt(0).toLowerCase()}${meta.description.slice(1)}`,
    docs: 'Installed automatically by the Video.js controls that use it.',
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: {
      role: 'support',
      framework: 'react',
      styling: target.styling,
      public: false,
    } satisfies VideojsRegistryMeta,
    $vjsc: {
      module,
      group: 'support',
      target: `ui/${meta.name}.tsx`,
      styleImports: styles.imports,
    },
  };
}

function skinItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'skin' }>,
  target: RegistryTarget
): VjscRegistryItem<SkinModuleMeta> {
  const skin = meta.name as SkinName;
  const preset = presetForSkin(skin);
  const theme = meta.style.theme;
  const directory = theme === 'minimal' ? `skins/${preset}/minimal` : `skins/${preset}`;
  const registryMeta = {
    role: 'skin',
    framework: target.framework,
    styling: target.styling,
    preset,
    media: preset.endsWith('audio') ? 'audio' : 'video',
    theme,
    public: true,
  } satisfies VideojsRegistryMeta;

  return {
    name: theme === 'minimal' ? `${preset}-minimal` : preset,
    type: 'registry:block',
    title: meta.title,
    description: meta.description,
    categories: ['media', 'skins', preset],
    docs: skinDocs(module, meta, skin, target, directory),
    registryDependencies: [...reactHelperDependency(target), '@videojs/_style-theme'],
    meta: registryMeta,
    $vjsc: {
      module,
      group: 'skins',
      target: (candidate, root) => skinModuleTarget(candidate, root, skin, target.framework),
      styleImports: ['styles/theme.css'],
      ...(target.styling === 'css'
        ? {
            stylesheet: {
              target: `${directory}/skin.css`,
              import: true,
            },
          }
        : {}),
    },
  };
}

function componentItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const category = componentCategory(module.filename);
  const styles = sourceStyles(module, target, graph);
  const registryMeta = {
    role: 'component',
    framework: 'react',
    styling: target.styling,
    public: true,
  } satisfies VideojsRegistryMeta;

  return {
    name: meta.name,
    type: 'registry:ui',
    title: meta.title,
    description: meta.description,
    categories: ['media', category],
    docs: componentDocs(module, meta),
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: registryMeta,
    $vjsc: {
      module,
      group: 'ui',
      target: `ui/${meta.name}.tsx`,
      styleImports: styles.imports,
    },
  };
}

function privateModuleItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  name: string,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): VjscRegistryItem<SkinModuleMeta> {
  const sourcePath = moduleSourcePath(module);
  const output = sourcePath.slice('components/'.length);
  const styles = sourceStyles(module, target, graph);
  const registryMeta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    name,
    type: 'registry:lib',
    title: 'Video.js Menu Chevron',
    description: 'Private menu direction indicator shared by editable Video.js menu components.',
    docs: 'Installed automatically by the Video.js menu components that use it.',
    registryDependencies: [...reactHelperDependency(target), ...styles.dependencies],
    meta: registryMeta,
    $vjsc: {
      module,
      group: 'support',
      target: `ui/${output.slice(output.lastIndexOf('/') + 1)}`,
      styleImports: styles.imports,
    },
  };
}

function utilsItem(
  module: ComponentGraphModule<SkinModuleMeta>,
  target: RegistryTarget
): VjscRegistryItem<SkinModuleMeta> {
  return {
    name: '_resolve-class-name',
    type: 'registry:lib',
    title: 'Video.js Utilities',
    description: 'Resolves state-aware class names used by editable Video.js React components.',
    docs: 'Installed automatically with React components and composed with the project Shadcn `cn` utility.',
    meta: {
      role: 'support',
      framework: 'react',
      styling: target.styling,
      public: false,
    } satisfies VideojsRegistryMeta,
    $vjsc: {
      module,
      group: 'support',
      filename: 'resolve-class-name.ts',
      target: 'lib/resolve-class-name.ts',
      imports: {
        '@videojs/utils/style': '@/lib/utils',
      },
    },
  };
}

function skinModuleTarget(
  module: ComponentGraphModule<SkinModuleMeta>,
  root: ComponentGraphModule<SkinModuleMeta>,
  skin: SkinName,
  framework: RegistryTarget['framework']
): string {
  if (module.id === root.id) return `${skinDirectory(skin)}/skin.tsx`;

  const sourcePath = moduleSourcePath(module);

  if (sourcePath.startsWith('components/')) {
    const component = sourcePath.slice('components/'.length);

    return framework === 'html' ? `${skinDirectory(skin)}/ui/${component}` : `ui/${component}`;
  }

  const match = /^skins\/([^/]+)\/(.+)$/.exec(sourcePath);
  if (!match) throw new Error(`Unsupported registry source: \`${sourcePath}\`.`);

  const [, owner, filename] = match;
  const directory = owner && isSkinName(owner) ? skinDirectory(owner) : `skins/${owner}`;

  return `${directory}/${filename}`;
}

function sourceStyles(
  module: ComponentGraphModule<SkinModuleMeta>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): { dependencies: string[]; imports: string[] } {
  const targets = new Set<string>(['styles/theme.css']);

  if (target.styling === 'css') {
    for (const id of graph.styles.get(module.id) ?? []) {
      const filename = virtualStyleFilename(id);
      const styleTarget = filename ? styleTargets[filename as keyof typeof styleTargets] : undefined;

      if (styleTarget) targets.add(styleTarget);
    }
  }

  const imports = [...targets].sort();

  return {
    imports,
    dependencies: imports.map((path) => `@videojs/_style-${basename(path, '.css')}`),
  };
}

function concernStyleItems(
  modules: readonly ComponentGraphModule<SkinModuleMeta>[],
  target: RegistryTarget
): VjscRegistryItem<SkinModuleMeta>[] {
  if (target.framework !== 'react' || target.styling !== 'css') return [];

  const shared = modules.filter(
    (module) =>
      module.transform.target === 'react' &&
      module.transform.style === 'css' &&
      module.transform.skin === undefined &&
      module.filename.includes('/components/')
  );

  return Object.entries(styleTargets).flatMap(([asset, styleTarget]) => {
    const owners = shared.filter((module) => (moduleStyles(module) ?? []).some((filename) => filename === asset));
    if (owners.length === 0) return [];

    const concern = basename(styleTarget, '.css');

    return [
      {
        name: `_style-${concern}`,
        type: 'registry:style',
        title: `Video.js ${concern} styles`,
        description: `Shared ${concern} styles used by editable Video.js UI components.`,
        docs: 'Installed automatically with the Video.js components that use these styles.',
        meta: privateStyleMeta(target),
        $vjsc: {
          kind: 'style',
          group: 'support',
          modules: owners,
          asset,
          target: styleTarget,
        },
      },
    ];
  });
}

function themeStyleItem(target: RegistryTarget): VjscRegistryItem<SkinModuleMeta> {
  return {
    name: '_style-theme',
    type: 'registry:style',
    title: 'Video.js media theme',
    description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
    docs: 'Installed automatically with Video.js skins and UI components.',
    ...(target.styling === 'tailwind'
      ? {
          cssVars: { theme: tailwindThemeVariables },
          css: tailwindRegistryCss,
        }
      : {}),
    meta: privateStyleMeta(target),
    $vjsc: {
      kind: 'style',
      group: 'support',
      modules: [],
      target: 'styles/theme.css',
      files: ['./styles/base.css'],
    },
  };
}

function privateStyleMeta(target: RegistryTarget): VideojsRegistryMeta {
  return {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  };
}

function moduleSourcePath(module: ComponentGraphModule<SkinModuleMeta>): string {
  return relative(vjscDir, module.filename).replaceAll('\\', '/');
}

function moduleStyles(module: ComponentGraphModule<SkinModuleMeta>): string[] | undefined {
  const matches = [...module.source.matchAll(/virtual:vjsc\/css\/[^"']+\/([^"']+)/g)];
  const filenames = matches.map((match) => decodeURIComponent(match[1]!));

  return filenames.length ? filenames : undefined;
}

function virtualStyleFilename(id: string): string | undefined {
  if (!id.startsWith('virtual:vjsc/css/')) return undefined;

  return decodeURIComponent(id.slice(id.lastIndexOf('/') + 1));
}

function componentCategory(filename: string): string {
  const match = /\/components\/([^/]+)\//.exec(filename);

  return match?.[1] ?? 'shared';
}

function componentDocs(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'component' }>
): string {
  const component = exportedComponentName(module);

  return `Installs \`${registryPaths.import}/ui/${meta.name}.tsx\` for use inside a compatible Video.js Player or Skin.

\`\`\`tsx
import { ${component} } from '${registryPaths.import}/ui/${meta.name}';

export function Controls() {
  return <${component} />;
}
\`\`\``;
}

function skinDocs(
  module: ComponentGraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'skin' }>,
  skin: SkinName,
  target: RegistryTarget,
  directory: string
): string {
  const component = exportedComponentName(module);
  const preset = presetForSkin(skin);
  const player = `${pascalCase(preset)}Player`;
  const media = preset.endsWith('audio') ? 'HlsAudio' : 'HlsJsVideo';
  const mediaEntry = preset.endsWith('audio') ? 'hls-audio' : 'hlsjs-video';

  if (target.framework === 'html') {
    return `Installs editable ${meta.title} source under \`${registryPaths.install}/${directory}\`. Requires \`@videojs/html@10.0.0-beta.32\`; import the matching Player and media registrations before using the installed light-DOM template.`;
  }

  return `Requires \`@videojs/react@10.0.0-beta.32\`, which is installed with this item.

\`\`\`tsx
import { ${media} } from '@videojs/react/media/${mediaEntry}';
import { ${player} } from '@videojs/react/${preset}';

import { ${component} } from '${registryPaths.import}/${directory}/skin';

export function Player({ src }: { src: string }) {
  return (
    <${player}>
      <${component} className="aspect-video w-full">
        <${media} src={src} />
      </${component}>
    </${player}>
  );
}
\`\`\``;
}

function exportedComponentName(module: ComponentGraphModule<SkinModuleMeta>): string {
  const match = /\bexport\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/.exec(module.source);
  if (!match) throw new Error(`Registry component has no exported component: \`${module.sourcePath}\`.`);

  return match[1]!;
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function skinDirectory(skin: SkinName): string {
  const preset = presetForSkin(skin);

  return skin.startsWith('minimal-') ? `skins/${preset}/minimal` : `skins/${preset}`;
}

function isSkinName(value: string | undefined): value is SkinName {
  return Boolean(value && value in skinStyles);
}

function presetForSkin(skin: SkinName): NonNullable<VideojsRegistryMeta['preset']> {
  return skin.replace(/^(?:default|minimal)-/, '') as NonNullable<VideojsRegistryMeta['preset']>;
}

function reactHelperDependency(target: RegistryTarget): string[] {
  return target.framework === 'react' ? ['@videojs/_resolve-class-name'] : [];
}

function configureRegistryModule(module: VjscModule): VjscModuleConfig | null {
  return module.filename === registryUtils ? null : configureSkinModule(module);
}

/** Keep the standalone host directory limited to static Shadcn registry assets. */
function registryAssetsOnly(): Plugin {
  return {
    name: 'skins:shadcn-assets-only',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const filename of Object.keys(bundle)) {
          if (!filename.startsWith('r/')) delete bundle[filename];
        }
      },
    },
  };
}
