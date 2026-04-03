import * as p from '@clack/prompts';
import type { InstallationOptions } from '@/utils/installation/codegen';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import { VALID_RENDERERS } from '@/utils/installation/types';

type Framework = 'html' | 'react';

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

export async function promptAllInstallOptions(framework: Framework): Promise<InstallationOptions> {
  const useCase = await p.select({
    message: 'Preset',
    options: PRESET_OPTIONS,
  });
  if (p.isCancel(useCase)) process.exit(0);

  const skin = await p.select({
    message: 'Skin',
    options: skinOptionsForUseCase(useCase),
  });
  if (p.isCancel(skin)) process.exit(0);

  const media = await p.select({
    message: 'Media source type',
    options: mediaOptionsForUseCase(useCase),
  });
  if (p.isCancel(media)) process.exit(0);

  const sourceUrl = await p.text({
    message: 'Source URL (leave blank for demo)',
    defaultValue: '',
  });
  if (p.isCancel(sourceUrl)) process.exit(0);

  const installMethodValue = await p.select({
    message: 'Install method',
    options: installMethodOptions(framework),
  });
  if (p.isCancel(installMethodValue)) process.exit(0);

  return {
    framework,
    useCase,
    skin,
    renderer: media,
    sourceUrl: sourceUrl ?? '',
    installMethod: installMethodValue,
  };
}
