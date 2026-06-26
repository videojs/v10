import { useStore } from '@nanostores/react';
import { Globe, Image } from 'lucide-react';
import type { ReactNode } from 'react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import { useCase } from '@/stores/installation';
import type { UseCase } from '@/utils/installation/types';
import { buildOptions } from '@/utils/installation/usecase-options';

const USE_CASE_ICONS: Record<UseCase, ReactNode> = {
  'default-video': <Globe size={32} />,
  'default-audio': <Globe size={32} />,
  'background-video': <Image size={32} />,
};

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  return (
    <ImageRadioGroup
      value={$useCase}
      onChange={(value) => useCase.set(value)}
      options={buildOptions().map((option) => ({
        value: option.value!,
        label: option.label,
        image: USE_CASE_ICONS[option.value!],
      }))}
      aria-label="Select use case"
    />
  );
}
