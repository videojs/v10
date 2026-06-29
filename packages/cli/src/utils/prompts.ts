import * as p from '@clack/prompts';
import cdnMedia from '@/content/cdn-media.json';
import { rendererSupportsCdn } from '@/utils/installation/cdn-code';
import type { InstallationOptions } from '@/utils/installation/codegen';
import { detectRenderer } from '@/utils/installation/detect-renderer';
import { buildOptions } from '@/utils/installation/renderer-options';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import type { Framework } from './config.js';

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
  p.note('💡 Tip: run `npx @videojs/cli config set framework ' + value + '` to save this preference');
  return value;
}

const PRESET_OPTIONS: Array<{ value: UseCase; label: string }> = [
  { value: 'default-video', label: 'Video' },
  { value: 'default-audio', label: 'Audio' },
  { value: 'background-video', label: 'Background Video' },
];

// Reuse the installation page's option builder so labels and ordering stay in
// lockstep with the UI.
function mediaOptionsForUseCase(useCase: UseCase): Array<{ value: Renderer; label: string }> {
  return buildOptions(useCase).map((option) => ({
    value: option.value as Renderer,
    label: option.label,
  }));
}

function skinOptionsForUseCase(useCase: UseCase): Array<{ value: Skin; label: string }> {
  if (useCase === 'background-video') {
    return [{ value: 'video', label: 'Default' }];
  }
  const isAudio = useCase === 'default-audio';
  return [
    { value: isAudio ? 'audio' : 'video', label: 'Default' },
    { value: isAudio ? 'minimal-audio' : 'minimal-video', label: 'Minimal' },
    { value: 'none', label: 'None (headless)' },
  ];
}

function installMethodOptions(
  framework: Framework,
  renderer: Renderer
): Array<{ value: InstallMethod; label: string }> {
  const options: Array<{ value: InstallMethod; label: string }> = [
    { value: 'npm', label: 'npm' },
    { value: 'pnpm', label: 'pnpm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'bun', label: 'bun' },
  ];
  // CDN is HTML-only, and only when the renderer ships a CDN build — matching
  // the install page, which hides the CDN tab for renderers without one.
  if (framework === 'html' && supportsCdnInstall(renderer)) {
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

export function mapRawSkin(skinFlag: string, useCase: UseCase): Skin {
  const isAudio = useCase === 'default-audio';
  const map: Record<string, Skin> = {
    default: isAudio ? 'audio' : 'video',
    minimal: isAudio ? 'minimal-audio' : 'minimal-video',
    none: 'none',
  };
  const result = map[skinFlag];
  if (!result) {
    console.error(`Invalid skin: "${skinFlag}". Must be "default", "minimal", or "none".`);
    process.exit(1);
  }
  return result;
}

export async function promptInstallOptions(
  framework: Framework,
  flags: PartialInstallFlags
): Promise<InstallationOptions> {
  const useCase =
    flags.preset ??
    (await (async () => {
      const value = await p.select({
        message: 'Preset',
        options: PRESET_OPTIONS,
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
        message: 'Skin',
        options: skinOptionsForUseCase(useCase),
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
      const options = mediaOptionsForUseCase(useCase);

      // Skip prompt if there's only one valid option
      if (options.length === 1) return options[0]!.value;

      const message = detected ? `Media source type (detected ${detected.label} from URL)` : 'Media source type';

      const value = await p.select({
        message,
        options,
        initialValue: detected?.renderer,
      });
      if (p.isCancel(value)) process.exit(0);
      return value as Renderer;
    })());

  const installMethod =
    flags.installMethod ??
    (await (async () => {
      const value = await p.select({
        message: 'Install method',
        options: installMethodOptions(framework, media),
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
