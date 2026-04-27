import * as p from '@clack/prompts';
import type { InstallationOptions } from '@/utils/installation/codegen';
import { detectRenderer } from '@/utils/installation/detect-renderer';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import { VALID_RENDERERS } from '@/utils/installation/types';
import type { Framework } from './config.js';

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

function mediaOptionsForUseCase(useCase: UseCase): Array<{ value: Renderer; label: string }> {
  const RENDERER_LABELS: Record<Renderer, string> = {
    'background-video': 'Background Video',
    hls: 'HLS',
    'html5-audio': 'HTML5 Audio',
    'html5-video': 'HTML5 Video',
  };

  return VALID_RENDERERS[useCase].map((r) => ({
    value: r,
    label: RENDERER_LABELS[r],
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
  ];
}

function installMethodOptions(framework: Framework): Array<{ value: InstallMethod; label: string }> {
  const options: Array<{ value: InstallMethod; label: string }> = [
    { value: 'npm', label: 'npm' },
    { value: 'pnpm', label: 'pnpm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'bun', label: 'bun' },
  ];
  if (framework === 'html') {
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
  };
  const result = map[skinFlag];
  if (!result) {
    console.error(`Invalid skin: "${skinFlag}". Must be "default" or "minimal".`);
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
        options: installMethodOptions(framework),
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
