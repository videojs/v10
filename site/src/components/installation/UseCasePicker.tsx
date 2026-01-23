import type { UseCase } from '@/stores/installation';

import { useStore } from '@nanostores/react';
import { Globe, Image } from 'lucide-react';

import ImageRadioGroup from '@/components/ImageRadioGroup';
import { useCase } from '@/stores/installation';

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  return (
    <ImageRadioGroup
      value={$useCase}
      onChange={value => useCase.set(value as UseCase)}
      options={[
        { value: 'website' satisfies UseCase, label: 'Website', image: <Globe size={32} /> },
        { value: 'background-video' satisfies UseCase, label: 'Background Video', image: <Image size={32} /> },
      ]}
      aria-label="Select use case"
    />
  );
}
