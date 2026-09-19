import { useStore } from '@nanostores/react';
import { navigate } from 'astro:transitions/client';
import { useEffect, useRef } from 'react';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { registryFramework, selectRegistryFramework } from '@/stores/registry';
import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';
import { getFrameworkPreferenceClient } from '@/utils/docs/preferences';
import {
  isRegistryFramework,
  type InstallationPickerFramework,
  resolveInstallationFrameworkNavigation,
} from '@/utils/installation/framework-navigation';
import type { InstallationRouteSegment } from '@/utils/installation/routes';
import type { RegistryFramework } from '@/utils/installation/shadcn';

/** Framework entry points. The selected framework determines which installation methods the next section offers. */
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
  route: InstallationRouteSegment;
}

function updateShadcnPanels(framework: RegistryFramework) {
  document.documentElement.dataset.registryFramework = framework;

  for (const panel of document.querySelectorAll<HTMLElement>('[data-shadcn-framework]')) {
    panel.hidden = panel.dataset.shadcnFramework !== framework;
  }
}

export default function JSPickerClient({ currentFramework, route }: Props) {
  const registrySelection = useStore(registryFramework);
  const shadcnUrlReady = useRef(false);
  const displayedFramework = route === 'shadcn' ? registrySelection : currentFramework;

  useEffect(() => {
    if (route !== 'shadcn') return;

    if (!shadcnUrlReady.current) {
      shadcnUrlReady.current = true;
      const value = new URLSearchParams(location.search).get('framework');
      const preferredFramework = getFrameworkPreferenceClient();
      const initialFramework = isRegistryFramework(value) ? value : (preferredFramework ?? 'react');

      selectRegistryFramework(initialFramework);

      if (initialFramework !== registrySelection) {
        updateShadcnPanels(initialFramework);
        return;
      }
    }

    updateShadcnPanels(registrySelection);

    const params = new URLSearchParams(location.search);

    params.set('framework', registrySelection);
    history.replaceState(history.state, '', `${location.pathname}?${params.toString()}${location.hash}`);
  }, [registrySelection, route]);

  const handleChange = (next: InstallationPickerFramework) => {
    if (next === displayedFramework) return;

    if (route === 'shadcn' && isRegistryFramework(next)) {
      selectRegistryFramework(next);
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
