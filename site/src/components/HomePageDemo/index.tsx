import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import { framework, skin } from '@/stores/homePageDemos';
import ToggleGroup from '../ToggleGroup';
import BaseDemo from './Base';
import EjectDemo from './Eject';

interface Props {
  className?: string;
}

export default function HomePageDemo({ className }: Props) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  return (
    <section className={clsx('grid gap-x-5 gap-y-5 lg:grid-cols-2', className)}>
      <section className="grid grid-rows-subgrid row-span-2 md:border-t border-y-faded-black py-5 md:py-10">
        <header className="md:pb-5">
          <h2 className="text-h5 text-faded-black text-center font-display-extended uppercase font-bold">
            Assemble your player
          </h2>
          <p className="text-base text-warm-gray text-center font-instrument-sans font-light">
            Feel at home with your framework, skin, and media source
          </p>

          <div className="flex md:hidden justify-center pt-8 w-full">
            <ToggleGroup
              toggleClassName="md:text-base md:py-1 w-full"
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
        </header>

        <BaseDemo className="lg:h-100 m-0" />
      </section>
      <section className="grid grid-rows-subgrid row-span-2 md:border-t border-y-faded-black py-5 md:py-10">
        <header className="md:pb-5">
          <h2 className="text-h5 text-faded-black text-center font-display-extended uppercase font-bold">
            Take full control
          </h2>
          <p className="text-base text-warm-gray text-center font-instrument-sans font-light">
            Make your player truly your own with fully-editable components
          </p>

          <div className="flex md:hidden justify-center pt-8 w-full">
            <ToggleGroup
              toggleClassName="md:text-base md:py-1 w-full"
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
        </header>
        <EjectDemo className="lg:h-100 m-0" />
      </section>
    </section>
  );
}
