import { useStore } from '@nanostores/react';

import { useCase } from '@/stores/installation';

import SkinPicker from './SkinPicker';

export default function SkinPickerSection({ children }: { children: React.ReactNode }) {
  const $useCase = useStore(useCase);
  // Hide for background-video use case
  if ($useCase === 'background-video') return null;

  // The heading and intro render inside this island so the whole section can disappear together. The picker takes the
  // same gap from its intro as the other pickers get from their ContentWidth frame.
  return (
    <>
      {children}
      <div className="mt-12">
        <SkinPicker />
      </div>
    </>
  );
}
