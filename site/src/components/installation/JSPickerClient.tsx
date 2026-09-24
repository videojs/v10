import type { InstallationFramework } from '@videojs/installation';
import { navigate } from 'astro:transitions/client';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { selectRegistryProjectFramework } from '@/stores/registry';
import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';
import { resolveInstallationFrameworkNavigation } from '@/utils/installation/framework-navigation';
import type { InstallationRouteSegment } from '@/utils/installation/routes';

import { useRegistryProjectFramework } from './useRegistryProjectFramework';

/** Framework entry points. The selected framework determines which installation methods the next section offers. */
const OPTIONS: CardRadioOption<InstallationFramework>[] = [
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
    description: 'Vue 3 using HTML custom elements',
    media: <VueLogo className="size-7" />,
  },
  {
    value: 'svelte',
    label: 'Svelte',
    description: 'Svelte 5 using HTML custom elements',
    media: <SvelteLogo className="size-7" />,
  },
];

interface Props {
  currentFramework: InstallationFramework;
  route: InstallationRouteSegment;
}

export default function JSPickerClient({ currentFramework, route }: Props) {
  const selectedRegistryFramework = useRegistryProjectFramework(currentFramework);
  const displayedFramework = route === 'shadcn' ? selectedRegistryFramework : currentFramework;

  const handleChange = (next: InstallationFramework) => {
    if (next === displayedFramework) return;

    if (route === 'shadcn') {
      selectRegistryProjectFramework(next);
      return;
    }

    const { target, history } = resolveInstallationFrameworkNavigation(new URL(window.location.href), next);

    savePageScrollForNavigation(target);
    void navigate(target, { history, info: DOCS_FRAMEWORK_NAVIGATION_INFO });
  };

  return (
    <CardRadioGroup
      value={displayedFramework}
      onChange={handleChange}
      options={OPTIONS}
      aria-label="Select JS framework"
    />
  );
}
