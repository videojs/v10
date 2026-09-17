import { useEffect } from 'react';

import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { skin } from '@/stores/installation';
import { getInstallationPreset, type Skin } from '@/utils/installation/types';

import SkinPreview from './SkinPreview';
import { useSelection } from './useSelection';

function option(value: Skin, label: string, description: string): CardRadioOption<Skin> {
  return { value, label, description, media: <SkinPreview skin={value} className="size-6" /> };
}

const VIDEO_SKINS: CardRadioOption<Skin>[] = [
  option('video', 'Default', 'Full controls, menus, captions, and dialogs'),
  option('minimal-video', 'Minimal', 'Play, seek, and volume, nothing else'),
  option('none', 'No skin', 'Bring your own UI built from the components'),
];

const AUDIO_SKINS: CardRadioOption<Skin>[] = [
  option('audio', 'Default', 'Full controls, menus, and a waveform-ready layout'),
  option('minimal-audio', 'Minimal', 'Play, seek, and volume, nothing else'),
  option('none', 'No skin', 'Bring your own UI built from the components'),
];

interface Props {
  includeNoSkin?: boolean;
}

export default function SkinPicker({ includeNoSkin = true }: Props) {
  const $skin = useSelection('skin');
  const $useCase = useSelection('useCase');

  const allOptions = getInstallationPreset($useCase).mediaType === 'audio' ? AUDIO_SKINS : VIDEO_SKINS;
  const options = includeNoSkin ? allOptions : allOptions.filter(({ value }) => value !== 'none');
  const firstSkin = options[0]!.value;

  useEffect(() => {
    if (!includeNoSkin && $skin === 'none') skin.set(firstSkin);
  }, [$skin, firstSkin, includeNoSkin]);

  return (
    <CardRadioGroup
      value={$skin}
      onChange={(value) => skin.set(value)}
      options={options}
      aria-label="Select skin"
      minColumnWidth="12rem"
    />
  );
}
