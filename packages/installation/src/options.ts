import { INSTALLATION_FRAMEWORKS, INSTALLATION_METHODS, PACKAGE_MANAGERS, type PlayerOwner } from './selection';
import { REGISTRY_STYLING_LABELS, REGISTRY_TEMPLATE_LABELS } from './shadcn';
import { INSTALLATION_PRESETS, INSTALLATION_SKIN_FLAGS, RENDERERS } from './types';

export interface InstallationOptionDefinition {
  flag: string;
  values?: readonly string[];
  default: string;
  description: string;
  appliesWhen?: string;
}

export function installationOptionDefinitions(owner: PlayerOwner): readonly InstallationOptionDefinition[] {
  return [
    {
      flag: '--method',
      values: INSTALLATION_METHODS,
      default: 'packaged',
      description: 'Choose packaged modules, editable Shadcn source, or CDN scripts.',
    },
    {
      flag: '--framework',
      values: owner === 'react' ? ['react'] : INSTALLATION_FRAMEWORKS.filter((value) => value !== 'react'),
      default: owner,
      description: 'The application framework that will host the player.',
    },
    {
      flag: '--preset',
      values: Object.values(INSTALLATION_PRESETS).map(({ flag }) => flag),
      default: 'video',
      description: 'The player configuration and control set.',
    },
    {
      flag: '--skin',
      values: INSTALLATION_SKIN_FLAGS,
      default: 'default',
      description: 'The visual skin. Minimal has cleaner surfaces and the same controls as Default.',
    },
    {
      flag: '--media',
      values: RENDERERS,
      default: "the selected preset's first compatible media source",
      description: 'The media source or playback adapter.',
    },
    {
      flag: '--source-url',
      default: 'a working Video.js demo source',
      description: 'The media URL placed in the generated player example.',
    },
    {
      flag: '--package-manager',
      values: PACKAGE_MANAGERS,
      default: 'npm',
      description: 'The command runner used for package and Shadcn commands.',
      appliesWhen: '--method packaged or --method shadcn',
    },
    {
      flag: '--template',
      values: Object.keys(REGISTRY_TEMPLATE_LABELS),
      default: 'next for React; vite otherwise',
      description: 'The Shadcn project template.',
      appliesWhen: '--method shadcn',
    },
    {
      flag: '--styling',
      values: Object.keys(REGISTRY_STYLING_LABELS),
      default: 'tailwind for React; css otherwise',
      description: 'The Shadcn source styling.',
      appliesWhen: '--method shadcn',
    },
    {
      flag: '--json',
      default: 'false',
      description: 'Return one structured JSON document instead of Markdown.',
    },
  ];
}
