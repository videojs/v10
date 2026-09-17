import { getInstallationPreset, type Skin, type UseCase } from './types';

export type RegistryFramework = 'html' | 'react';
export type RegistryProjectFramework = RegistryFramework | 'svelte' | 'vue';
export type RegistryTemplate = 'next' | 'vite' | 'start' | 'laravel' | 'react-router' | 'astro';
export type RegistryStyling = 'css' | 'tailwind';
export type RegistryTheme = 'default' | 'minimal';
export type RegistryPreset = 'audio' | 'live-audio' | 'live-video' | 'video';
export type ShadcnRunner = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** Where `packages/skins` publishes its hosted registry; see its `netlify.toml`. */
export const REGISTRY_ORIGIN = 'https://shadcn.videojs.org';
export const REGISTRY_NAMESPACE = '@videojs';
/** Where the CLI places added skin files, relative to the project's components alias. */
export const REGISTRY_INSTALL_DIRECTORY = 'components/videojs';

export const SHADCN_RUNNER_NAMES = ['npm', 'pnpm', 'yarn', 'bun'] as const satisfies readonly ShadcnRunner[];

export const SHADCN_RUNNERS = {
  npm: 'npx shadcn@latest',
  pnpm: 'pnpm dlx shadcn@latest',
  yarn: 'yarn dlx shadcn@latest',
  bun: 'bunx --bun shadcn@latest',
} as const satisfies Record<ShadcnRunner, string>;

export const REGISTRY_STYLING_LABELS = {
  tailwind: 'Tailwind CSS',
  css: 'Vanilla CSS',
} as const satisfies Record<RegistryStyling, string>;

export const REGISTRY_TEMPLATE_LABELS = {
  next: 'Next.js',
  vite: 'Vite',
  start: 'TanStack Start',
  laravel: 'Laravel',
  'react-router': 'React Router',
  astro: 'Astro',
} as const satisfies Record<RegistryTemplate, string>;

export const REGISTRY_TEMPLATES = [
  'next',
  'vite',
  'start',
  'laravel',
  'react-router',
  'astro',
] as const satisfies readonly RegistryTemplate[];

export const REGISTRY_THEMES = ['default', 'minimal'] as const satisfies readonly RegistryTheme[];

export const REGISTRY_THEME_LABELS = {
  default: 'Default',
  minimal: 'Minimal',
} as const satisfies Record<RegistryTheme, string>;

export const DEFAULT_REGISTRY_PRESET = 'video' satisfies RegistryPreset;

export interface RegistrySkin {
  /** Registry item name, such as `video` or `live-audio`. */
  readonly item: RegistryPreset;
  readonly label: string;
  readonly preset: RegistryPreset;
  readonly theme: RegistryTheme;
  /** Where the skin installs, relative to the components alias. */
  readonly directory: string;
}

export const REGISTRY_PRESETS = (
  [
    ['video', 'Video'],
    ['audio', 'Audio'],
    ['live-video', 'Live Video'],
    ['live-audio', 'Live Audio'],
  ] as const
).map(([preset, label]) => ({
  item: preset,
  label,
  preset,
  directory: `${REGISTRY_INSTALL_DIRECTORY}/${preset}`,
}));

/**
 * The skins the registry publishes, in the order of the skin reference pages. Background video stays a package skin.
 * Mirrors `skinCatalog` in `packages/skins/build/catalog.ts`.
 */
export const REGISTRY_SKINS: readonly RegistrySkin[] = REGISTRY_PRESETS.flatMap(({ preset, label, directory }) => [
  {
    item: preset,
    label: `Default ${label}`,
    preset,
    theme: 'default',
    directory,
  },
  {
    item: preset,
    label: `Minimal ${label}`,
    preset,
    theme: 'minimal',
    directory,
  },
]);

/** The stylings a framework's registry catalog publishes. HTML skins are vanilla CSS only. */
export function registryStylings(framework: RegistryFramework): readonly RegistryStyling[] {
  return framework === 'react' ? ['tailwind', 'css'] : ['css'];
}

export function defaultRegistryStyling(framework: RegistryFramework): RegistryStyling {
  return registryStylings(framework)[0]!;
}

export function defaultRegistryTemplate(framework: RegistryProjectFramework): RegistryTemplate {
  return framework === 'react' ? 'next' : 'vite';
}

/** Keep a styling choice made for one framework valid for another. */
export function resolveRegistryStyling(framework: RegistryFramework, styling: RegistryStyling | null): RegistryStyling {
  return styling && registryStylings(framework).includes(styling) ? styling : defaultRegistryStyling(framework);
}

/** The `{name}` template Shadcn stores in `components.json` for one catalog. */
export function registryNamespaceUrl(
  framework: RegistryFramework,
  styling: RegistryStyling,
  theme: RegistryTheme = 'default'
): string {
  const target = framework === 'react' && styling === 'css' ? 'react/css' : framework;
  const catalog = theme === 'minimal' ? `${target}/minimal` : target;

  return `${REGISTRY_ORIGIN}/r/${catalog}/{name}.json`;
}

export function shadcnCommand(runner: ShadcnRunner, action: string): string {
  return `${SHADCN_RUNNERS[runner]} ${action}`;
}

export function shadcnInitCommand(runner: ShadcnRunner, template: RegistryTemplate): string {
  return shadcnCommand(runner, `init --template ${template}`);
}

/** Points the `@videojs` namespace at one catalog; Shadcn writes it into `components.json`. */
export function shadcnRegistryAddCommand(
  runner: ShadcnRunner,
  framework: RegistryFramework,
  styling: RegistryStyling,
  theme: RegistryTheme = 'default'
): string {
  return shadcnCommand(runner, `registry add ${REGISTRY_NAMESPACE}=${registryNamespaceUrl(framework, styling, theme)}`);
}

export function shadcnAddCommand(runner: ShadcnRunner, items: readonly string[]): string {
  return shadcnCommand(runner, `add ${items.map((item) => `${REGISTRY_NAMESPACE}/${item}`).join(' ')}`);
}

/** Every command one install needs, in order: register the namespace, then add the items, if any. */
export function registryInstallCommands(
  runner: ShadcnRunner,
  framework: RegistryFramework,
  styling: RegistryStyling,
  items: readonly string[],
  theme: RegistryTheme = 'default'
): string {
  const commands = [shadcnRegistryAddCommand(runner, framework, styling, theme)];

  if (items.length > 0) commands.push(shadcnAddCommand(runner, items));

  return commands.join('\n');
}

/** The catalog and item for an installation selection, or `null` when its files are unavailable. */
export function registrySkinSelection({
  useCase,
  skin,
}: {
  useCase: UseCase;
  skin: Skin;
}): Pick<RegistrySkin, 'item' | 'theme'> | null {
  if (useCase === 'background-video' || skin === 'none') return null;

  const item = REGISTRY_PRESETS.find((preset) => preset.item === getInstallationPreset(useCase).flag)?.item;
  if (!item) return null;

  return {
    item,
    theme: skin.startsWith('minimal-') ? 'minimal' : 'default',
  };
}
