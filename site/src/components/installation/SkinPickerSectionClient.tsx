import { useStore } from '@nanostores/react';
import { useCase } from '@/stores/installation';
import SkinPicker from './SkinPicker';

export default function SkinPickerSection({ children }: { children: React.ReactNode }) {
  const $useCase = useStore(useCase);

  // Hide for background-video use case
  if ($useCase === 'background-video') {
    return null;
  }

  return (
    <>
      {children}
      <SkinPicker />
    </>
  );
}
