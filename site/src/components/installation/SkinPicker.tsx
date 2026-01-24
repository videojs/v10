import { useStore } from '@nanostores/react';
import { Minus, Sparkles } from 'lucide-react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import type { Skin } from '@/stores/installation';
import { skin } from '@/stores/installation';

export default function SkinPicker() {
  const $skin = useStore(skin);

  return (
    <ImageRadioGroup
      value={$skin}
      onChange={(value) => skin.set(value as Skin)}
      options={[
        { value: 'frosted' satisfies Skin, label: 'Frosted', image: <Sparkles size={32} /> },
        { value: 'minimal' satisfies Skin, label: 'Minimal', image: <Minus size={32} /> },
      ]}
      aria-label="Select skin"
    />
  );
}
