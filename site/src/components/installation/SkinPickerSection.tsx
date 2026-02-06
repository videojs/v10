import { useStore } from '@nanostores/react';
import { useCase } from '@/stores/installation';
import SkinPicker from './SkinPicker';

export default function SkinPickerSection() {
  const $useCase = useStore(useCase);

  // Hide for background-video use case
  if ($useCase === 'background-video') {
    return null;
  }

  return (
    <>
      <h2 className="text-lg font-medium @lg:text-h5 @3xl:text-h4 mb-6 max-w-3xl mx-auto mt-18 [&+h3]:mt-6">
        Choose skin
      </h2>
      <p className="my-6 max-w-3xl mx-auto">Choose how your player looks.</p>
      <SkinPicker />
    </>
  );
}
