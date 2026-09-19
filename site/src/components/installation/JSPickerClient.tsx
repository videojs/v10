import { navigate } from 'astro:transitions/client';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';
import {
  type InstallationPickerFramework,
  resolveInstallationFrameworkNavigation,
} from '@/utils/installation/framework-navigation';

/**
 * Frameworks the installation flow can start from. React and HTML switch the docs framework; Vue and Svelte open their
 * own installation pages, which build on the HTML custom elements.
 */
const OPTIONS: CardRadioOption<InstallationPickerFramework>[] = [
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
  currentFramework: InstallationPickerFramework;
}

export default function JSPickerClient({ currentFramework }: Props) {
  const handleChange = (next: InstallationPickerFramework) => {
    if (next === currentFramework) return;

    const { target, history } = resolveInstallationFrameworkNavigation(currentFramework, next, window.location.search);

    savePageScrollForNavigation(target);
    void navigate(target, { history, info: DOCS_FRAMEWORK_NAVIGATION_INFO });
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
