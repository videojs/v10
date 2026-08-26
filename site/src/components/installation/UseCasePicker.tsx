import { useStore } from '@nanostores/react';
import { Globe, Image, RadioTower } from 'lucide-react';

import ImageRadioGroup from '@/components/ImageRadioGroup';
import { useCase } from '@/stores/installation';
import { getInstallationPreset, USE_CASES, type UseCase } from '@/utils/installation/types';

function getPresetIcon(useCase: UseCase) {
  if (useCase === 'background-video') return <Image size={32} />;

  if (getInstallationPreset(useCase).live) return <RadioTower size={32} />;

  return <Globe size={32} />;
}

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  return (
    <ImageRadioGroup
      value={$useCase}
      onChange={(value) => useCase.set(value as UseCase)}
      options={USE_CASES.map((value) => ({
        value,
        label: getInstallationPreset(value).label,
        image: getPresetIcon(value),
      }))}
      aria-label="Select use case"
    />
  );
}
