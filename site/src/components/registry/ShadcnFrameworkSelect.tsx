import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { registryFramework, selectRegistryFramework } from '@/stores/registry';
import { getFrameworkPreferenceClient } from '@/utils/docs/preferences';
import type { RegistryFramework } from '@/utils/installation/shadcn';

const OPTIONS: CardRadioOption<RegistryFramework>[] = [
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
];

function isRegistryFramework(value: string | null): value is RegistryFramework {
  return value === 'react' || value === 'html';
}

function updatePanels(framework: RegistryFramework) {
  for (const panel of document.querySelectorAll<HTMLElement>('[data-shadcn-framework]')) {
    const active = panel.dataset.shadcnFramework === framework;

    panel.hidden = !active;
  }
}

export default function ShadcnFrameworkSelect() {
  const framework = useStore(registryFramework);
  const urlReady = useRef(false);

  useEffect(() => {
    if (!urlReady.current) {
      urlReady.current = true;
      const value = new URLSearchParams(location.search).get('framework');
      const preferredFramework = getFrameworkPreferenceClient();
      const initialFramework = isRegistryFramework(value) ? value : (preferredFramework ?? 'react');

      selectRegistryFramework(initialFramework);

      if (initialFramework !== framework) {
        updatePanels(initialFramework);
        return;
      }
    }

    updatePanels(framework);

    const params = new URLSearchParams(location.search);

    params.set('framework', framework);

    history.replaceState(history.state, '', `${location.pathname}?${params.toString()}${location.hash}`);
  }, [framework]);

  const handleChange = (next: RegistryFramework) => {
    if (next === framework) return;

    selectRegistryFramework(next);
  };

  return (
    <CardRadioGroup
      value={framework}
      onChange={handleChange}
      options={OPTIONS}
      aria-label="Select player framework"
      minColumnWidth="14rem"
    />
  );
}
