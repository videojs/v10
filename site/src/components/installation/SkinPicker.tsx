import { useStore } from '@nanostores/react';
import { Minus, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import type { ImageRadioOption } from '@/components/ImageRadioGroup';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import { skin, useCase } from '@/stores/installation';
import type { Skin } from '@/utils/installation/types';

const VIDEO_SKINS: ImageRadioOption<Skin>[] = [
  { value: 'video', label: 'Default', image: <Sparkles size={32} /> },
  { value: 'minimal-video', label: 'Minimal', image: <Minus size={32} /> },
];

const AUDIO_SKINS: ImageRadioOption<Skin>[] = [
  { value: 'audio', label: 'Default', image: <Sparkles size={32} /> },
  { value: 'minimal-audio', label: 'Minimal', image: <Minus size={32} /> },
];

export default function SkinPicker() {
  const $skin = useStore(skin);
  const $useCase = useStore(useCase);

  const options = $useCase === 'default-audio' ? AUDIO_SKINS : VIDEO_SKINS;

  // Auto-switch skin when use case changes and current skin is invalid
  useEffect(() => {
    const validValues = options.map((o) => o.value);
    if (!validValues.includes(skin.get())) {
      skin.set(options[0].value);
    }
  }, [options]);

  return (
    <ImageRadioGroup value={$skin} onChange={(value) => skin.set(value)} options={options} aria-label="Select skin" />
  );
}
