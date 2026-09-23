import { useStore } from '@nanostores/react';
import type { InstallationFramework } from '@videojs/installation';
import { navigate } from 'astro:transitions/client';
import type { ReactNode } from 'react';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { registryProjectFramework, selectRegistryProjectFramework } from '@/stores/registry';
import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';
import { resolveInstallationFrameworkNavigation } from '@/utils/installation/framework-navigation';
import type { InstallationRouteSegment } from '@/utils/installation/routes';
import useIsHydrated from '@/utils/useIsHydrated';

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
  children?: ReactNode;
  currentFramework: InstallationFramework;
  route: InstallationRouteSegment;
}

export default function JSPickerClient({ children, currentFramework, route }: Props) {
  const selectedRegistryFramework = useStore(registryProjectFramework);
  const isHydrated = useIsHydrated();
  const displayedFramework = route === 'shadcn' && isHydrated ? selectedRegistryFramework : currentFramework;

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
    <>
      <CardRadioGroup
        value={displayedFramework}
        onChange={handleChange}
        options={OPTIONS}
        aria-label="Select JS framework"
      />
      {displayedFramework === 'html' && route !== 'cdn' && children}
    </>
  );
}
