import * as p from '@clack/prompts';
import cdnMedia from '@/content/cdn-media.json';
import { rendererSupportsCdn } from '@/utils/installation/cdn-code';
import type { InstallationOptions } from '@/utils/installation/codegen';
import { detectRenderer } from '@/utils/installation/detect-renderer';
import { buildOptions as buildInstallMethodOptions } from '@/utils/installation/install-method-options';
import { buildOptions as buildRendererOptions } from '@/utils/installation/renderer-options';
import { buildOptions as buildSkinOptions } from '@/utils/installation/skin-options';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import { buildOptions as buildUseCaseOptions } from '@/utils/installation/usecase-options';
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

// All option lists below reuse the installation page's shared builders so labels
// and ordering stay in lockstep with the UI — there's a single source of truth
// per picker, no drift between the CLI prompt and the docs page.

function useCaseOptions(): Array<{ value: UseCase; label: string }> {
  return buildUseCaseOptions().map((option) => ({
    value: option.value as UseCase,
    label: option.label,
  }));
}

function mediaOptionsForUseCase(useCase: UseCase): Array<{ value: Renderer; label: string }> {
  return buildRendererOptions(useCase).map((option) => ({
    value: option.value as Renderer,
    label: option.label,
  }));
}

function skinOptionsForUseCase(useCase: UseCase): Array<{ value: Skin; label: string }> {
  return buildSkinOptions(useCase).map((option) => ({
    value: option.value as Skin,
    label: option.label,
  }));
}

function installMethodOptions(
  framework: Framework,
  renderer: Renderer
): Array<{ value: InstallMethod; label: string }> {
  // CDN is HTML-only, and only when the renderer ships a CDN build — matching
  // the install page, which hides the CDN tab for renderers without one.
  const includeCdn = framework === 'html' && supportsCdnInstall(renderer);
  return buildInstallMethodOptions({ includeCdn }).map((option) => ({
    value: option.value as InstallMethod,
    label: option.label,
  }));
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
        options: useCaseOptions(),
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
