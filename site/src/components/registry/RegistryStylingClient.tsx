import { useStore } from '@nanostores/react';

import { Select } from '@/components/Select';
import { registryStyling } from '@/stores/registry';
import {
  REGISTRY_STYLING_LABELS,
  type RegistryFramework,
  registryStylings,
  resolveRegistryStyling,
} from '@/utils/installation/shadcn';

interface Props {
  framework: RegistryFramework;
}

/** Picks the styling catalog every registry command on the page installs from. */
export default function RegistryStylingClient({ framework }: Props) {
  const $styling = useStore(registryStyling);
  const value = resolveRegistryStyling(framework, $styling);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-p3">Styling</span>
      <Select
        value={value}
        onChange={(next) => registryStyling.set(next)}
        options={registryStylings(framework).map((styling) => ({
          value: styling,
          label: REGISTRY_STYLING_LABELS[styling],
        }))}
        aria-label="Select styling"
        data-testid="registry-styling-select"
      />
    </div>
  );
}
