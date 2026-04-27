import { useStore } from '@nanostores/react';
import { Globe, Image } from 'lucide-react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import { useCase } from '@/stores/installation';
import type { UseCase } from '@/utils/installation/types';

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  return (
    <ImageRadioGroup
      value={$useCase}
      onChange={(value) => useCase.set(value as UseCase)}
      options={[
        { value: 'default-video' satisfies UseCase, label: 'Video', image: <Globe size={32} /> },
        { value: 'default-audio' satisfies UseCase, label: 'Audio', image: <Globe size={32} /> },
        { value: 'background-video' satisfies UseCase, label: 'Background Video', image: <Image size={32} /> },
      ]}
      aria-label="Select use case"
    />
  );
}
