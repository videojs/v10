import { getInstallationPreset, type Skin, type UseCase } from './types';

export type RegistryFramework = 'html' | 'react';
export type RegistryStyling = 'css' | 'tailwind';
export type ShadcnRunner = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** Where `packages/skins` publishes its hosted registry; see its `netlify.toml`. */
export const REGISTRY_ORIGIN = 'https://shadcn.videojs.org';
export const REGISTRY_NAMESPACE = '@videojs';
/** Where the CLI places installed source, relative to the project's components alias. */
export const REGISTRY_INSTALL_DIRECTORY = 'components/videojs';

export const SHADCN_RUNNERS: Record<ShadcnRunner, string> = {
  npm: 'npx shadcn@latest',
  pnpm: 'pnpm dlx shadcn@latest',
  yarn: 'yarn dlx shadcn@latest',
  bun: 'bunx --bun shadcn@latest',
};

export const REGISTRY_STYLING_LABELS: Record<RegistryStyling, string> = {
  tailwind: 'Tailwind CSS',
  css: 'Vanilla CSS',
};

export interface RegistrySkin {
  /** Registry item name, such as `video` or `video-minimal`. */
  readonly item: string;
  readonly label: string;
  readonly preset: 'audio' | 'live-audio' | 'live-video' | 'video';
  readonly theme: 'default' | 'minimal';
  /** Where the skin installs, relative to the components alias. */
  readonly directory: string;
}

/**
 * The skins the registry publishes, in the order of the skin reference pages. Background video stays a package skin.
 * Mirrors `skinCatalog` in `packages/skins/build/catalog.ts`.
 */
export const REGISTRY_SKINS: readonly RegistrySkin[] = (
  [
    ['video', 'Video'],
    ['audio', 'Audio'],
    ['live-video', 'Live Video'],
    ['live-audio', 'Live Audio'],
  ] as const
).flatMap(([preset, label]) => [
  {
    item: preset,
    label: `Default ${label}`,
    preset,
    theme: 'default',
    directory: `${REGISTRY_INSTALL_DIRECTORY}/skins/${preset}`,
  },
  {
    item: `${preset}-minimal`,
    label: `Minimal ${label}`,
    preset,
    theme: 'minimal',
    directory: `${REGISTRY_INSTALL_DIRECTORY}/skins/${preset}/minimal`,
  },
]);

/** The stylings a framework's registry catalog publishes. HTML skins are vanilla CSS only. */
export function registryStylings(framework: RegistryFramework): readonly RegistryStyling[] {
  return framework === 'react' ? ['tailwind', 'css'] : ['css'];
}

export function defaultRegistryStyling(framework: RegistryFramework): RegistryStyling {
  return registryStylings(framework)[0]!;
}

/** Keep a styling choice made for one framework valid for another. */
export function resolveRegistryStyling(framework: RegistryFramework, styling: RegistryStyling | null): RegistryStyling {
  return styling && registryStylings(framework).includes(styling) ? styling : defaultRegistryStyling(framework);
}

/** The `{name}` template Shadcn stores in `components.json` for one catalog. */
export function registryNamespaceUrl(framework: RegistryFramework, styling: RegistryStyling): string {
  const catalog = framework === 'react' && styling === 'css' ? 'react/css' : framework;

  return `${REGISTRY_ORIGIN}/r/${catalog}/{name}.json`;
}

export function shadcnCommand(runner: ShadcnRunner, action: string): string {
  return `${SHADCN_RUNNERS[runner]} ${action}`;
}

/** Points the `@videojs` namespace at one catalog; Shadcn writes it into `components.json`. */
export function shadcnRegistryAddCommand(
  runner: ShadcnRunner,
  framework: RegistryFramework,
  styling: RegistryStyling
): string {
  return shadcnCommand(runner, `registry add ${REGISTRY_NAMESPACE}=${registryNamespaceUrl(framework, styling)}`);
}

export function shadcnAddCommand(runner: ShadcnRunner, items: readonly string[]): string {
  return shadcnCommand(runner, `add ${items.map((item) => `${REGISTRY_NAMESPACE}/${item}`).join(' ')}`);
}

/** Every command one install needs, in order: register the namespace, then add the items, if any. */
export function registryInstallCommands(
  runner: ShadcnRunner,
  framework: RegistryFramework,
  styling: RegistryStyling,
  items: readonly string[]
): string {
  const commands = [shadcnRegistryAddCommand(runner, framework, styling)];

  if (items.length > 0) commands.push(shadcnAddCommand(runner, items));

  return commands.join('\n');
}

/** The catalog name for an installation selection, or `null` when that selection cannot be ejected. */
export function registrySkinItem({ useCase, skin }: { useCase: UseCase; skin: Skin }): string | null {
  if (useCase === 'background-video' || skin === 'none') return null;

  const preset = getInstallationPreset(useCase).flag;

  return skin.startsWith('minimal-') ? `${preset}-minimal` : preset;
}
