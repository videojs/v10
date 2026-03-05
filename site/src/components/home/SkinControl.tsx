import { useStore } from '@nanostores/react';
import { skin } from '@/stores/homePageDemos';
import ToggleGroup from '../ToggleGroup';

export default function SkinControl({ className }: { className?: string }) {
  const $skin = useStore(skin);

  return (
    <ToggleGroup
      className={className}
      value={[$skin]}
      onChange={(values) => {
        if (values.length > 0) skin.set(values[0]);
      }}
      options={[
        { value: 'frosted', label: 'Frosted' },
        { value: 'minimal', label: 'Minimal' },
      ]}
      aria-label="Select skin"
    />
  );
}
