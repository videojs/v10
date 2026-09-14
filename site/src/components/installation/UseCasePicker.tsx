import { useStore } from '@nanostores/react';
import { Globe, Image, RadioTower } from 'lucide-react';

import ImageRadioGroup from '@/components/ImageRadioGroup';
import { useCase } from '@/stores/installation';
import { ANALYTICS_EVENTS, trackEvent } from '@/utils/analytics';
import { getInstallationPreset, USE_CASES, type UseCase } from '@/utils/installation/types';

function getPresetIcon(useCase: UseCase) {
  if (useCase === 'background-video') return <Image size={32} />;

  if (getInstallationPreset(useCase).live) return <RadioTower size={32} />;

  return <Globe size={32} />;
}

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  const selectUseCase = (value: UseCase) => {
    const previous = useCase.get();
    if (value === previous) return;

    useCase.set(value);
    trackEvent(ANALYTICS_EVENTS.installOptionChanged, { option: 'use_case', value, previous });
  };

  return (
    <ImageRadioGroup
      value={$useCase}
      onChange={selectUseCase}
      options={USE_CASES.map((value) => ({
        value,
        label: getInstallationPreset(value).label,
        image: getPresetIcon(value),
      }))}
      aria-label="Select use case"
    />
  );
}
