import { PACKAGE_MANAGERS, type InstallationProject, type PackageManager } from './parameters';
import { getInstallationPreset, type Skin, type UseCase } from './presets';
import {
  installationProjectAliasSetup,
  type InstallationProjectSetupBlock,
  type InstallationTemplate,
} from './projects';

export type RegistryFramework = 'html' | 'react';
export type RegistryStyling = 'css' | 'tailwind';
export type RegistryTheme = 'default' | 'minimal';
export type RegistryPreset = 'audio' | 'live-audio' | 'live-video' | 'video';
export type ShadcnRunner = PackageManager;

/** Where `packages/skins` publishes its hosted registry; see its `netlify.toml`. */
export const REGISTRY_ORIGIN = 'https://shadcn.videojs.org';
export const REGISTRY_NAMESPACE = '@videojs';
/** Where the CLI places added skin source, relative to the project's components alias. */
export const REGISTRY_INSTALL_DIRECTORY = 'components/videojs';

export const SHADCN_RUNNER_NAMES = PACKAGE_MANAGERS;

export const SHADCN_RUNNERS = {
  npm: 'npx shadcn@latest',
  pnpm: 'pnpm dlx shadcn@latest',
  yarn: 'npx shadcn@latest',
  bun: 'bunx --bun shadcn@latest',
} as const satisfies Record<ShadcnRunner, string>;

export const REGISTRY_STYLING_LABELS = {
  tailwind: 'Tailwind CSS',
  css: 'Vanilla CSS',
} as const satisfies Record<RegistryStyling, string>;

export const REGISTRY_STYLINGS = ['tailwind', 'css'] as const satisfies readonly RegistryStyling[];
const HTML_REGISTRY_STYLINGS = ['css'] as const satisfies readonly RegistryStyling[];

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
  return framework === 'react' ? REGISTRY_STYLINGS : HTML_REGISTRY_STYLINGS;
}

export function defaultRegistryStyling(framework: RegistryFramework): RegistryStyling {
  return registryStylings(framework)[0]!;
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

export function shadcnInitCommand(runner: ShadcnRunner, template?: InstallationTemplate): string {
  if (!template) return shadcnCommand(runner, 'init --base base --preset nova --yes');

  const action = `init --template ${template} --no-monorepo --base base --preset nova --name videojs-app --yes`;
  const command =
    runner === 'yarn'
      ? `npx --yes --package shadcn@latest --call 'npm_config_user_agent="yarn/1.22.22" shadcn ${action}'`
      : shadcnCommand(runner, action);

  return `${command}\ncd videojs-app`;
}

/** Initialize Shadcn only when an existing project has no components config. */
export function optionalShadcnInitCommand(runner: ShadcnRunner): string {
  return `# Optional: run if components.json does not exist.\n${shadcnInitCommand(runner)}`;
}

/** A minimal standard Shadcn config for the vanilla-CSS registries, which do not need Tailwind or React setup. */
export function shadcnComponentsConfig(
  framework: RegistryFramework,
  template: InstallationTemplate,
  componentsAlias: string
): string {
  const rootAlias = componentsAlias.split('/')[0] ?? '@';
  const libAlias = `${rootAlias}/lib`;

  return JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema.json',
      style: 'new-york',
      rsc: framework === 'react' && template === 'next',
      tsx: true,
      tailwind: {
        config: '',
        css: '',
        baseColor: 'neutral',
        // `false` makes Shadcn rewrite copied string literals for inline Tailwind colors, which CSS source never needs.
        cssVariables: true,
        prefix: '',
      },
      aliases: {
        components: componentsAlias,
        utils: `${libAlias}/utils`,
        ui: `${componentsAlias}/ui`,
        lib: libAlias,
        hooks: `${rootAlias}/hooks`,
      },
      registries: {},
    },
    null,
    2
  );
}

export type ShadcnProjectConfiguration =
  | {
      mode: 'components-json';
      aliasSetup: readonly InstallationProjectSetupBlock[];
      componentsConfig: string;
    }
  | {
      mode: 'shadcn-init';
      aliasSetup: readonly InstallationProjectSetupBlock[];
      componentsConfig: null;
    };

export type ShadcnProjectConfigurationPlacement = 'app' | 'registry' | 'section';

/** Resolve the one source-registry setup shared by generated plans and the installation guide. */
export function shadcnProjectConfiguration(
  framework: RegistryFramework,
  template: InstallationTemplate,
  styling: RegistryStyling,
  componentsAlias: string
): ShadcnProjectConfiguration {
  if (framework === 'react' && styling === 'tailwind') {
    return {
      mode: 'shadcn-init',
      aliasSetup: installationProjectAliasSetup(framework, template),
      componentsConfig: null,
    };
  }

  return {
    mode: 'components-json',
    aliasSetup: installationProjectAliasSetup(framework, template),
    componentsConfig: shadcnComponentsConfig(framework, template, componentsAlias),
  };
}

/** Decide where one project surfaces its Shadcn initialization or components config. */
export function shadcnProjectConfigurationPlacement(
  configuration: ShadcnProjectConfiguration,
  project: InstallationProject
): ShadcnProjectConfigurationPlacement {
  if (configuration.mode === 'components-json') return 'section';

  if (project === 'new') return 'app';

  return configuration.aliasSetup.length > 0 ? 'section' : 'registry';
}

export function shadcnAddCommand(runner: ShadcnRunner, items: readonly string[]): string {
  return shadcnCommand(
    runner,
    `add ${items.map((item) => `${REGISTRY_NAMESPACE}/${item}`).join(' ')} --overwrite --yes`
  );
}

/** Add the selected Video.js catalog to `components.json` through the Shadcn CLI. */
export function shadcnRegistryAddCommand(
  runner: ShadcnRunner,
  framework: RegistryFramework,
  styling: RegistryStyling,
  theme: RegistryTheme = 'default'
): string {
  return shadcnCommand(runner, `registry add ${REGISTRY_NAMESPACE}=${registryNamespaceUrl(framework, styling, theme)}`);
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
