import {
  INSTALLATION_FRAMEWORKS,
  PACKAGE_MANAGERS,
  sourceFrameworkFor,
  type InstallationFramework,
  type InstallationMethod,
  type PlayerOwner,
  type PresetFlag,
  type SkinFlag,
} from './selection';
import { registryStylings, registryTemplates, type RegistryStyling, type RegistryTemplate } from './shadcn';
import { INSTALLATION_PRESETS, INSTALLATION_SKIN_FLAGS, RENDERERS, type Renderer } from './types';

export interface InstallationOptionDefinition {
  flag: string;
  values?: readonly string[];
  default: string;
  description: string;
  appliesWhen?: string;
}

export interface InstallationOptionContext {
  methods: readonly InstallationMethod[];
  frameworks: readonly InstallationFramework[];
}

export interface InstallationCompatibility {
  mediaByPreset: Readonly<Record<PresetFlag, readonly Renderer[]>>;
  shadcn: {
    presets: readonly PresetFlag[];
    skins: readonly SkinFlag[];
    templatesByFramework: Readonly<Record<InstallationFramework, readonly RegistryTemplate[]>>;
    stylingsByFramework: Readonly<Record<InstallationFramework, readonly RegistryStyling[]>>;
  };
}

const SHADCN_PRESETS = Object.values(INSTALLATION_PRESETS)
  .map(({ flag }) => flag)
  .filter((flag) => flag !== 'background-video');

export const installationCompatibility: InstallationCompatibility = {
  mediaByPreset: {
    video: INSTALLATION_PRESETS['default-video'].renderers,
    audio: INSTALLATION_PRESETS['default-audio'].renderers,
    'live-video': INSTALLATION_PRESETS['live-video'].renderers,
    'live-audio': INSTALLATION_PRESETS['live-audio'].renderers,
    'background-video': INSTALLATION_PRESETS['background-video'].renderers,
  },
  shadcn: {
    presets: SHADCN_PRESETS,
    skins: INSTALLATION_SKIN_FLAGS.filter((skin) => skin !== 'none'),
    templatesByFramework: {
      react: registryTemplates('react'),
      html: registryTemplates('html'),
      vue: registryTemplates('html'),
      svelte: registryTemplates('html'),
    },
    stylingsByFramework: {
      react: registryStylings('react'),
      html: registryStylings('html'),
      vue: registryStylings('html'),
      svelte: registryStylings('html'),
    },
  },
};

function unique<Choice extends string>(values: readonly Choice[]): Choice[] {
  return [...new Set(values)];
}

export function installationOptionDefinitionsFor(
  context: InstallationOptionContext
): readonly InstallationOptionDefinition[] {
  const { methods, frameworks } = context;
  const shadcnOnly = methods.length === 1 && methods[0] === 'shadcn';
  const supportsShadcn = methods.includes('shadcn');
  const supportsPackages = methods.some((method) => method !== 'cdn');
  const sourceFrameworks = unique(frameworks.map(sourceFrameworkFor));
  const templates = unique(sourceFrameworks.flatMap((framework) => registryTemplates(framework)));
  const stylings = unique(sourceFrameworks.flatMap((framework) => registryStylings(framework)));
  const definitions: InstallationOptionDefinition[] = [
    {
      flag: '--method',
      values: methods,
      default: methods[0]!,
      description: 'Choose packaged modules, editable Shadcn source, or CDN scripts.',
    },
    {
      flag: '--framework',
      values: frameworks,
      default: frameworks[0]!,
      description: 'The application framework that will host the player.',
    },
    {
      flag: '--preset',
      values: shadcnOnly
        ? installationCompatibility.shadcn.presets
        : Object.values(INSTALLATION_PRESETS).map(({ flag }) => flag),
      default: 'video',
      description: 'The player configuration and control set.',
    },
    {
      flag: '--skin',
      values: shadcnOnly ? installationCompatibility.shadcn.skins : INSTALLATION_SKIN_FLAGS,
      default: 'default',
      description: 'The visual skin. Minimal has cleaner surfaces and the same controls as Default.',
    },
    {
      flag: '--media',
      values: RENDERERS,
      default: "the selected preset's first compatible media source",
      description: 'The media source or playback adapter. See the preset compatibility map below.',
    },
    {
      flag: '--source-url',
      default: 'a working Video.js demo source',
      description: 'The media URL placed in the generated player example.',
    },
  ];

  if (supportsPackages) {
    definitions.push({
      flag: '--package-manager',
      values: PACKAGE_MANAGERS,
      default: 'npm',
      description: 'The command runner used for package and Shadcn commands.',
      appliesWhen: '--method packaged or --method shadcn',
    });
  }

  if (supportsShadcn) {
    definitions.push(
      {
        flag: '--template',
        values: templates,
        default:
          sourceFrameworks.length === 1
            ? sourceFrameworks[0] === 'react'
              ? 'next'
              : 'vite'
            : 'next for React; vite otherwise',
        description: 'The Shadcn project template. Compatible values depend on the framework.',
        appliesWhen: '--method shadcn',
      },
      {
        flag: '--styling',
        values: stylings,
        default:
          sourceFrameworks.length === 1
            ? sourceFrameworks[0] === 'react'
              ? 'tailwind'
              : 'css'
            : 'tailwind for React; css otherwise',
        description: 'The Shadcn source styling. Compatible values depend on the framework.',
        appliesWhen: '--method shadcn',
      }
    );
  }

  definitions.push({
    flag: '--json',
    default: 'false',
    description: 'Return one structured JSON document instead of Markdown.',
  });

  return definitions;
}

export function installationOptionDefinitions(owner: PlayerOwner): readonly InstallationOptionDefinition[] {
  return installationOptionDefinitionsFor({
    methods: owner === 'react' ? ['packaged', 'shadcn'] : ['packaged', 'shadcn', 'cdn'],
    frameworks: owner === 'react' ? ['react'] : INSTALLATION_FRAMEWORKS.filter((value) => value !== 'react'),
  });
}
