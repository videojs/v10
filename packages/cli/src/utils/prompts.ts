import * as p from '@clack/prompts';

import cdnMedia from '@/content/cdn-media.json';
import { rendererSupportsCdn } from '@/utils/installation/cdn-code';
import type { InstallationOptions } from '@/utils/installation/codegen';
import { detectRenderer } from '@/utils/installation/detect-renderer';
import { buildOptions } from '@/utils/installation/renderer-options';
import {
  defaultRegistryStyling,
  defaultRegistryTemplate,
  type RegistryFramework,
  type RegistryStyling,
  REGISTRY_STYLING_LABELS,
  type RegistryTemplate,
  REGISTRY_TEMPLATE_LABELS,
  registryStylings,
  registryTemplates,
} from '@/utils/installation/shadcn';
import {
  getInstallationPreset,
  type InstallMethod,
  INSTALLATION_SKIN_FLAGS,
  type Renderer,
  type Skin,
  USE_CASES,
  type UseCase,
} from '@/utils/installation/types';

import type { Framework } from './config.js';
import type { InstallationFramework, InstallationMethod } from './installation-request.js';

const CDN_MEDIA_SUBPATHS = cdnMedia.map((entry) => entry.id);

export function supportsCdnInstall(renderer: Renderer): boolean {
  return rendererSupportsCdn(renderer, CDN_MEDIA_SUBPATHS);
}

export async function promptFramework(): Promise<Framework> {
  const value = await p.select({
    message: 'Which framework?',
    options: [
      { value: 'html' as const, label: 'HTML (custom elements)' },
      { value: 'react' as const, label: 'React' },
    ],
  });

  if (p.isCancel(value)) process.exit(0);

  p.note(`💡 Tip: run \`npx @videojs/cli config set framework ${value}\` to save this preference`);
  return value;
}

export async function promptInstallationMethod(): Promise<InstallationMethod> {
  const value = await p.select({
    message: 'Installation method',
    options: [
      { value: 'packaged' as const, label: 'Packaged', hint: 'Install packages and use a ready-made skin' },
      { value: 'shadcn' as const, label: 'Shadcn', hint: 'Add editable skin source to the project' },
      { value: 'cdn' as const, label: 'CDN', hint: 'Load the HTML player from jsDelivr' },
    ],
  });

  if (p.isCancel(value)) process.exit(0);

  return value;
}

export async function promptInstallationFramework(
  method: Exclude<InstallationMethod, 'cdn'>
): Promise<InstallationFramework> {
  const options = [
    { value: 'react' as const, label: 'React' },
    { value: 'html' as const, label: 'HTML custom elements' },
    ...(method === 'packaged'
      ? [
          { value: 'vue' as const, label: 'Vue or Nuxt' },
          { value: 'svelte' as const, label: 'Svelte or SvelteKit' },
        ]
      : []),
  ];
  const value = await p.select({ message: 'JS framework', options });

  if (p.isCancel(value)) process.exit(0);

  return value;
}

const PRESET_OPTIONS = USE_CASES.map((value) => ({ value, label: getInstallationPreset(value).label }));

// Reuse the installation page's option builder so labels and ordering stay in
// lockstep with the UI.
function mediaOptionsForUseCase(useCase: UseCase, cdnOnly: boolean): Array<{ value: Renderer; label: string }> {
  return buildOptions(useCase).flatMap((option) => {
    if (option.value === null || (cdnOnly && !supportsCdnInstall(option.value))) return [];

    return [{ value: option.value, label: option.label }];
  });
}

function skinOptionsForUseCase(useCase: UseCase, allowNoSkin: boolean): Array<{ value: Skin; label: string }> {
  if (useCase === 'background-video') {
    return [{ value: 'video', label: 'Default' }];
  }

  const isAudio = getInstallationPreset(useCase).mediaType === 'audio';

  const options: Array<{ value: Skin; label: string }> = [
    { value: isAudio ? 'audio' : 'video', label: 'Default' },
    { value: isAudio ? 'minimal-audio' : 'minimal-video', label: 'Minimal' },
  ];

  if (allowNoSkin) options.push({ value: 'none', label: 'None (headless)' });

  return options;
}

function installMethodOptions(
  framework: Framework,
  renderer: Renderer,
  allowCdn: boolean
): Array<{ value: InstallMethod; label: string }> {
  const options: Array<{ value: InstallMethod; label: string }> = [
    { value: 'npm', label: 'npm' },
    { value: 'pnpm', label: 'pnpm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'bun', label: 'bun' },
  ];

  if (allowCdn && framework === 'html' && supportsCdnInstall(renderer)) {
    options.unshift({ value: 'cdn', label: 'CDN' });
  }

  return options;
}

export interface PartialInstallFlags {
  preset?: UseCase;
  skin?: Skin;
  rawSkin?: string;
  sourceUrl?: string;
  media?: Renderer;
  installMethod?: InstallMethod;
}

export interface PromptInstallOptionsConfig {
  allowBackground?: boolean;
  allowCdn?: boolean;
  allowNoSkin?: boolean;
  cdnMediaOnly?: boolean;
  skinLabel?: string;
}

export function mapRawSkin(skinFlag: string, useCase: UseCase): Skin {
  const isAudio = getInstallationPreset(useCase).mediaType === 'audio';
  const map: Record<string, Skin> = {
    default: isAudio ? 'audio' : 'video',
    minimal: isAudio ? 'minimal-audio' : 'minimal-video',
    none: 'none',
  };
  const result = map[skinFlag];

  if (!result) {
    console.error(
      `Invalid skin: "${skinFlag}". Must be ${INSTALLATION_SKIN_FLAGS.map((flag) => `"${flag}"`).join(', ')}.`
    );
    process.exit(1);
  }

  return result;
}

export async function promptInstallOptions(
  framework: Framework,
  flags: PartialInstallFlags,
  {
    allowBackground = true,
    allowCdn = true,
    allowNoSkin = true,
    cdnMediaOnly = false,
    skinLabel = 'Skin',
  }: PromptInstallOptionsConfig = {}
): Promise<InstallationOptions> {
  const presetOptions = allowBackground
    ? PRESET_OPTIONS
    : PRESET_OPTIONS.filter((option) => option.value !== 'background-video');
  const useCase =
    flags.preset ??
    (await (async () => {
      const value = await p.select({
        message: 'Preset',
        options: presetOptions,
      });

      if (p.isCancel(value)) process.exit(0);

      return value;
    })());

  // Resolve raw --skin flag now that useCase is known
  const resolvedSkin = flags.rawSkin ? mapRawSkin(flags.rawSkin, useCase) : flags.skin;

  const skin =
    resolvedSkin ??
    (await (async () => {
      const value = await p.select({
        message: skinLabel,
        options: skinOptionsForUseCase(useCase, allowNoSkin),
      });

      if (p.isCancel(value)) process.exit(0);

      return value;
    })());

  const sourceUrl =
    flags.sourceUrl ??
    (await (async () => {
      const value = await p.text({
        message: 'Source URL (leave blank for demo)',
        defaultValue: '',
      });

      if (p.isCancel(value)) process.exit(0);

      return value ?? '';
    })());

  // Detect media type from URL when not explicitly provided
  const detected = sourceUrl ? detectRenderer(sourceUrl, useCase) : null;

  const media =
    flags.media ??
    (await (async () => {
      const options = mediaOptionsForUseCase(useCase, cdnMediaOnly);
      // Skip prompt if there's only one valid option
      if (options.length === 1) return options[0]!.value;

      const supportedDetection =
        detected && options.some((option) => option.value === detected.renderer) ? detected : null;
      const message = supportedDetection
        ? `Media source type (detected ${supportedDetection.label} from URL)`
        : 'Media source type';

      const value = await p.select({
        message,
        options,
        initialValue: supportedDetection?.renderer,
      });

      if (p.isCancel(value)) process.exit(0);

      return value as Renderer;
    })());

  const installMethod =
    flags.installMethod ??
    (await (async () => {
      const value = await p.select({
        message: allowCdn ? 'Install method' : 'Package manager',
        options: installMethodOptions(framework, media, allowCdn),
      });

      if (p.isCancel(value)) process.exit(0);

      return value;
    })());

  return {
    framework,
    useCase,
    skin,
    renderer: media,
    sourceUrl,
    installMethod,
  };
}

export interface PartialShadcnFlags {
  styling?: RegistryStyling;
  template?: RegistryTemplate;
}

export interface ShadcnSetup {
  styling: RegistryStyling;
  template: RegistryTemplate;
}

export async function promptShadcnSetup(framework: RegistryFramework, flags: PartialShadcnFlags): Promise<ShadcnSetup> {
  const template =
    flags.template ??
    (await (async () => {
      const value = await p.select({
        message: 'Project template',
        options: registryTemplates(framework).map((candidate) => ({
          value: candidate,
          label: REGISTRY_TEMPLATE_LABELS[candidate],
        })),
        initialValue: defaultRegistryTemplate(framework),
      });

      if (p.isCancel(value)) process.exit(0);

      return value;
    })());
  const styling =
    flags.styling ??
    (await (async () => {
      const value = await p.select({
        message: 'Styling',
        options: registryStylings(framework).map((candidate) => ({
          value: candidate,
          label: REGISTRY_STYLING_LABELS[candidate],
        })),
        initialValue: defaultRegistryStyling(framework),
      });

      if (p.isCancel(value)) process.exit(0);

      return value;
    })());

  return { template, styling };
}
