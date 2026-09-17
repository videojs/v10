import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import { Select, type SelectOption } from '@/components/Select';
import type { SupportedFramework } from '@/types/docs';

/**
 * Frameworks the installation flow can start from. React and HTML switch the docs framework; Vue and Svelte open their
 * own installation pages, which build on the HTML custom elements.
 */
type PickerFramework = SupportedFramework | 'vue' | 'svelte';

const OPTIONS: SelectOption<PickerFramework>[] = [
  {
    value: 'react',
    label: 'React',
    icon: <ReactLogo className="size-4" />,
  },
  {
    value: 'html',
    label: 'HTML',
    icon: <Html5Logo className="size-4" />,
  },
  {
    value: 'vue',
    label: 'Vue',
    icon: <VueLogo className="size-4" />,
  },
  {
    value: 'svelte',
    label: 'Svelte',
    icon: <SvelteLogo className="size-4" />,
  },
];

interface Props {
  currentFramework: PickerFramework;
}

export default function JSPickerClient({ currentFramework }: Props) {
  const handleChange = (next: PickerFramework) => {
    if (next === currentFramework) return;

    window.location.href = `/docs/guides/installation/${next}${window.location.search}`;
  };

  return (
    <div className="grid gap-1.5">
      <p className="text-p4 font-medium">Framework</p>
      <Select
        value={currentFramework}
        onChange={(next) => next && handleChange(next)}
        options={OPTIONS}
        aria-label="Select framework"
        className="justify-self-start"
      />
    </div>
  );
}
