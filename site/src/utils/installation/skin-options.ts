import type { SelectOption } from '@/components/Select';
import type { Skin, UseCase } from '@/utils/installation/types';

export const SKIN_LABELS: Record<Skin, string> = {
  video: 'Default',
  audio: 'Default',
  'minimal-video': 'Minimal',
  'minimal-audio': 'Minimal',
  none: 'None (headless)',
};

export function buildOptions(useCase: UseCase): SelectOption<Skin>[] {
  // Background video has a single fixed skin, so there's no real choice — the UI
  // hides the picker entirely and the CLI auto-selects this option.
  if (useCase === 'background-video') {
    return [{ value: 'video', label: SKIN_LABELS.video }];
  }

  const isAudio = useCase === 'default-audio';
  const defaultSkin: Skin = isAudio ? 'audio' : 'video';
  const minimalSkin: Skin = isAudio ? 'minimal-audio' : 'minimal-video';

  return [
    { value: defaultSkin, label: SKIN_LABELS[defaultSkin] },
    { value: minimalSkin, label: SKIN_LABELS[minimalSkin] },
    { value: 'none', label: SKIN_LABELS.none },
  ];
}
