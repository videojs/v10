import { basename } from 'node:path';

import type { ComponentGraph, ComponentGraphModule } from '../../../vjsc/src/graph/index.ts';
import type { VjscRegistryItem } from '../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../vjsc/meta.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

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

export interface SourceStyles {
  readonly dependencies: string[];
  readonly imports: string[];
}

export function sourceStyles(
  module: ComponentGraphModule<SkinModuleMeta>,
  target: RegistryTarget,
  graph: ComponentGraph<SkinModuleMeta>
): SourceStyles {
  const targets = new Set<string>(['styles/theme.css']);

  if (target.styling === 'css') {
    for (const id of graph.styles.get(module.id) ?? []) {
      const filename = virtualStyleFilename(id);
      const styleTarget = isStyleTarget(filename) ? styleTargets[filename] : undefined;

      if (styleTarget) targets.add(styleTarget);
    }
  }

  const imports = [...targets].sort();

  return {
    imports,
    dependencies: imports.map((path) => `@videojs/_style-${basename(path, '.css')}`),
  };
}

export function concernStyleItems(
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

export function themeStyleItem(target: RegistryTarget): VjscRegistryItem<SkinModuleMeta> {
  return {
    name: '_style-theme',
    type: 'registry:style',
    title: 'Video.js media theme',
    description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
    docs: 'Installed automatically with Video.js skins and UI components.',
    cssVars: target.styling === 'tailwind' ? { theme: tailwindThemeVariables } : undefined,
    css: target.styling === 'tailwind' ? tailwindRegistryCss : undefined,
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

function moduleStyles(module: ComponentGraphModule<SkinModuleMeta>): string[] | undefined {
  const matches = [...module.source.matchAll(/virtual:vjsc\/css\/[^"']+\/([^"']+)/g)];
  const filenames = matches.map((match) => decodeURIComponent(match[1]!));

  return filenames.length ? filenames : undefined;
}

function virtualStyleFilename(id: string): string | undefined {
  if (!id.startsWith('virtual:vjsc/css/')) return undefined;

  return decodeURIComponent(id.slice(id.lastIndexOf('/') + 1));
}

function isStyleTarget(value: string | undefined): value is keyof typeof styleTargets {
  return Boolean(value && value in styleTargets);
}
