import { useStore } from '@nanostores/react';
import { useCase } from '@/stores/installation';
import EmbedMethodPicker from './EmbedMethodPicker';

export default function EmbedMethodPickerSectionClient({ children }: { children: React.ReactNode }) {
  const $useCase = useStore(useCase);

  if ($useCase === 'background-video') {
    return null;
  }

  return (
    <>
      {children}
      <EmbedMethodPicker />
    </>
  );
}
