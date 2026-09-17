import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import type { SupportedFramework } from '@/types/docs';

/**
 * Frameworks the installation flow can start from. React and HTML switch the docs framework; Vue and Svelte open their
 * own installation pages, which build on the HTML custom elements.
 */
type PickerFramework = SupportedFramework | 'vue' | 'svelte';

const OPTIONS: CardRadioOption<PickerFramework>[] = [
  {
    value: 'react',
    label: 'React',
    description: 'Components and hooks for React 19',
    media: <ReactLogo className="size-7" />,
  },
  {
    value: 'html',
    label: 'HTML',
    description: 'Custom elements for any stack',
    media: <Html5Logo className="size-7" />,
  },
  {
    value: 'vue',
    label: 'Vue',
    description: 'Vue 3 and Nuxt, using the custom elements',
    media: <VueLogo className="size-7" />,
  },
  {
    value: 'svelte',
    label: 'Svelte',
    description: 'Svelte 5 and SvelteKit, using the custom elements',
    media: <SvelteLogo className="size-7" />,
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
    <CardRadioGroup
      value={currentFramework}
      onChange={handleChange}
      options={OPTIONS}
      aria-label="Select JS framework"
    />
  );
}
