import type { RegistryStylesOptions } from '../../../../vjsc/src/shadcn/index.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

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

export function registryStyles(target: RegistryTarget): RegistryStylesOptions | undefined {
  if (target.framework === 'html' && target.styling === 'css') return undefined;

  const meta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    theme: {
      target: 'styles/theme.css',
      include: ['./styles/base.css'],
      title: 'Video.js media theme',
      description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
      docs: 'Installed automatically with Video.js skins and UI components.',
      cssVars: target.styling === 'tailwind' ? { theme: tailwindThemeVariables } : undefined,
      css: target.styling === 'tailwind' ? tailwindRegistryCss : undefined,
      meta,
    },
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
  };
}
