import { useStore } from '@nanostores/react';
import { framework } from '@/stores/homePageDemos';
import ToggleGroup from '../ToggleGroup';

export default function FrameworkControl({ className }: { className?: string }) {
  const $framework = useStore(framework);

  return (
    <ToggleGroup
      className={className}
      value={[$framework]}
      onChange={(values) => {
        if (values.length > 0) framework.set(values[0]);
      }}
      options={[
        { value: 'react', label: 'React' },
        { value: 'html', label: 'HTML' },
      ]}
      aria-label="Select framework"
    />
  );
}
