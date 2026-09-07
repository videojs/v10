import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { skin, useCase } from '@/stores/installation';
import { getInstallationPreset, type Skin } from '@/utils/installation/types';

import SkinPreview from './SkinPreview';

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

export default function SkinPicker() {
  const $skin = useStore(skin);
  const $useCase = useStore(useCase);

  const options = getInstallationPreset($useCase).mediaType === 'audio' ? AUDIO_SKINS : VIDEO_SKINS;

  // Auto-switch skin when use case changes and current skin is invalid
  useEffect(() => {
    const validValues = options.map((o) => o.value);

    if (!validValues.includes(skin.get())) {
      skin.set(options[0].value);
    }
  }, [options]);

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
