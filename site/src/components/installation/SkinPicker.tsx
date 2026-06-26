import { useStore } from '@nanostores/react';
import { Code2, Minus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import { skin, useCase } from '@/stores/installation';
import { buildOptions } from '@/utils/installation/skin-options';
import type { Skin } from '@/utils/installation/types';

const SKIN_ICONS: Record<Skin, ReactNode> = {
  video: <Sparkles size={32} />,
  audio: <Sparkles size={32} />,
  'minimal-video': <Minus size={32} />,
  'minimal-audio': <Minus size={32} />,
  none: <Code2 size={32} />,
};

export default function SkinPicker() {
  const $skin = useStore(skin);
  const $useCase = useStore(useCase);

  const options = buildOptions($useCase).map((option) => ({
    value: option.value!,
    label: option.label,
    image: SKIN_ICONS[option.value!],
  }));

  // Auto-switch skin when use case changes and current skin is invalid
  useEffect(() => {
    const valid = buildOptions($useCase);
    if (!valid.some((o) => o.value === skin.get())) {
      skin.set(valid[0]!.value!);
    }
  }, [$useCase]);

  return (
    <ImageRadioGroup value={$skin} onChange={(value) => skin.set(value)} options={options} aria-label="Select skin" />
  );
}
