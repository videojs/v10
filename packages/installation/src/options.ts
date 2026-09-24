import { installationParameterForKey, PACKAGE_MANAGERS, type InstallationInputKey } from './parameters';
import { INSTALLATION_PRESETS, INSTALLATION_SKIN_FLAGS } from './presets';
import {
  defaultInstallationTemplate,
  installationTemplates,
  type InstallationFramework,
  type InstallationTemplate,
} from './projects';
import { RENDERERS, type Renderer } from './renderers';
import {
  INSTALLATION_FRAMEWORKS,
  installationMethodsForFramework,
  installationTemplatesForMethod,
  sourceFrameworkFor,
  type InstallationMethod,
  type PlayerOwner,
  type PresetFlag,
  type SkinFlag,
} from './selection';
import { defaultRegistryStyling, registryStylings, type RegistryStyling } from './shadcn';

export interface InstallationOptionDefinition {
  flag: string;
  query?: string;
  values?: readonly string[];
  default: string;
  description: string;
  appliesWhen?: string;
}

function optionDefinition(
  key: InstallationInputKey,
  definition: Omit<InstallationOptionDefinition, 'flag' | 'query'>
): InstallationOptionDefinition {
  const parameter = installationParameterForKey(key);

  return { ...definition, flag: parameter.flag, query: parameter.query };
}

export interface InstallationOptionContext {
  methods: readonly InstallationMethod[];
  frameworks: readonly InstallationFramework[];
}

export interface InstallationCompatibility {
  methodsByFramework: Readonly<Record<InstallationFramework, readonly InstallationMethod[]>>;
  templatesByFramework: Readonly<Record<InstallationFramework, readonly InstallationTemplate[]>>;
  mediaByPreset: Readonly<Record<PresetFlag, readonly Renderer[]>>;
  shadcn: {
    presets: readonly PresetFlag[];
    skins: readonly SkinFlag[];
    stylingsByFramework: Readonly<Record<InstallationFramework, readonly RegistryStyling[]>>;
  };
}

export interface InstallationDiscoveryCompatibility {
  methodsByFramework: Readonly<Partial<InstallationCompatibility['methodsByFramework']>>;
  templatesByFramework: Readonly<Partial<InstallationCompatibility['templatesByFramework']>>;
  mediaByPreset: InstallationCompatibility['mediaByPreset'];
  shadcn: {
    presets: InstallationCompatibility['shadcn']['presets'];
    skins: InstallationCompatibility['shadcn']['skins'];
    stylingsByFramework: Readonly<Partial<InstallationCompatibility['shadcn']['stylingsByFramework']>>;
  };
}

const SHADCN_PRESETS = Object.values(INSTALLATION_PRESETS)
  .map(({ flag }) => flag)
  .filter((flag) => flag !== 'background-video');

export const installationCompatibility: InstallationCompatibility = {
  methodsByFramework: {
    react: installationMethodsForFramework('react'),
    html: installationMethodsForFramework('html'),
    vue: installationMethodsForFramework('vue'),
    svelte: installationMethodsForFramework('svelte'),
  },
  templatesByFramework: {
    react: installationTemplates('react'),
    html: installationTemplates('html'),
    vue: installationTemplates('vue'),
    svelte: installationTemplates('svelte'),
  },
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
    stylingsByFramework: {
      react: registryStylings('react'),
      html: registryStylings('html'),
      vue: registryStylings('html'),
      svelte: registryStylings('html'),
    },
  },
};

export function installationCompatibilityFor(
  frameworks: readonly InstallationFramework[]
): InstallationDiscoveryCompatibility {
  return {
    methodsByFramework: Object.fromEntries(
      frameworks.map((framework) => [framework, installationCompatibility.methodsByFramework[framework]])
    ),
    templatesByFramework: Object.fromEntries(
      frameworks.map((framework) => [framework, installationCompatibility.templatesByFramework[framework]])
    ),
    mediaByPreset: installationCompatibility.mediaByPreset,
    shadcn: {
      presets: installationCompatibility.shadcn.presets,
      skins: installationCompatibility.shadcn.skins,
      stylingsByFramework: Object.fromEntries(
        frameworks.map((framework) => [framework, installationCompatibility.shadcn.stylingsByFramework[framework]])
      ),
    },
  };
}

function formatChoices(values: readonly string[]): string {
  if (values.length < 2) return values[0] ?? '';

  if (values.length === 2) return `${values[0]} or ${values[1]}`;

  return `${values.slice(0, -1).join(', ')}, or ${values.at(-1)}`;
}

function unique<Choice extends string>(values: readonly Choice[]): Choice[] {
  return [...new Set(values)];
}

export function installationOptionDefinitionsFor(
  context: InstallationOptionContext
): readonly InstallationOptionDefinition[] {
  const { methods, frameworks } = context;
  const shadcnOnly = methods.length === 1 && methods[0] === 'shadcn';
  const supportsShadcn = methods.includes('shadcn');
  const sourceFrameworks = unique(frameworks.map(sourceFrameworkFor));
  const cdnOnly = methods.length === 1 && methods[0] === 'cdn';
  const templates = unique(
    methods.flatMap((method) => frameworks.flatMap((framework) => installationTemplatesForMethod(framework, method)))
  );
  const templateDefaults = cdnOnly ? (['vite'] as const) : unique(frameworks.map(defaultInstallationTemplate));
  const stylings = unique(sourceFrameworks.flatMap((framework) => registryStylings(framework)));
  const definitions: InstallationOptionDefinition[] = [
    optionDefinition('method', {
      values: methods,
      default: methods[0]!,
      description: `Choose ${formatChoices(
        methods.map((method) =>
          method === 'packaged' ? 'packaged modules' : method === 'shadcn' ? 'editable Shadcn source' : 'CDN scripts'
        )
      )}.`,
    }),
    optionDefinition('framework', {
      values: frameworks,
      default: frameworks[0]!,
      description: 'The application framework that will host the player.',
    }),
    optionDefinition('preset', {
      values: shadcnOnly
        ? installationCompatibility.shadcn.presets
        : Object.values(INSTALLATION_PRESETS).map(({ flag }) => flag),
      default: 'video',
      description: 'The player configuration and control set.',
    }),
    optionDefinition('skin', {
      values: shadcnOnly ? installationCompatibility.shadcn.skins : INSTALLATION_SKIN_FLAGS,
      default: 'default',
      description: 'The visual skin. Minimal has cleaner surfaces and the same controls as Default.',
      appliesWhen: '--preset is not background-video',
    }),
    optionDefinition('media', {
      values: RENDERERS,
      default: "the selected preset's first compatible media source",
      description: 'The media source or playback adapter. See the preset compatibility map below.',
    }),
    optionDefinition('sourceUrl', {
      default: 'a working Video.js demo source',
      description: 'The media URL placed in the generated player example.',
    }),
  ];

  definitions.push(
    optionDefinition('packageManager', {
      values: PACKAGE_MANAGERS,
      default: "the project's package manager; otherwise pnpm when available",
      description: 'The command runner used for app setup, packages, Shadcn, and the development server.',
    }),
    optionDefinition('template', {
      values: templates,
      default: templateDefaults.length === 1 ? templateDefaults[0]! : 'next for React; vite otherwise',
      description:
        'The app setup and file layout. `none` keeps an existing plain HTML setup and is unavailable with Shadcn.',
    })
  );

  if (supportsShadcn) {
    definitions.push(
      optionDefinition('styling', {
        values: stylings,
        default:
          sourceFrameworks.length === 1
            ? defaultRegistryStyling(sourceFrameworks[0]!)
            : 'tailwind for React; css otherwise',
        description: 'The Shadcn source styling. Compatible values depend on the framework.',
        appliesWhen: '--method shadcn',
      })
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
