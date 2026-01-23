import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import { framework, skin } from '@/stores/homePageDemos';
import ToggleGroup from '../ToggleGroup';

export default function HomePageControls({ className }: { className?: string }) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  return (
    <section
      className={clsx(
        'flex flex-row flex-wrap sm:grid sm:grid-cols-2 gap-2 sm:gap-9 items-center justify-center',
        className
      )}
    >
      <div className="flex justify-end">
        <ToggleGroup
          toggleClassName="md:text-base md:py-1"
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
      </div>
      <div>
        <ToggleGroup
          toggleClassName="md:text-base md:py-1"
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
      </div>
    </section>
  );
}
