import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { registryFramework, registryStyling, registryTemplate } from '@/stores/registry';
import { defaultRegistryTemplate, type RegistryFramework } from '@/utils/installation/shadcn';

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

    if (active) panel.removeAttribute('data-search-ignore');
    else panel.setAttribute('data-search-ignore', 'all');
  }
}

export default function ShadcnFrameworkSelect() {
  const framework = useStore(registryFramework);
  const urlReady = useRef(false);

  useEffect(() => {
    if (!urlReady.current) {
      urlReady.current = true;
      const value = new URLSearchParams(location.search).get('framework');
      const initialFramework = isRegistryFramework(value) ? value : 'react';

      if (initialFramework !== framework) {
        registryFramework.set(initialFramework);
        registryTemplate.set(defaultRegistryTemplate(initialFramework));
        registryStyling.set(null);
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

    registryFramework.set(next);
    registryTemplate.set(defaultRegistryTemplate(next));
    registryStyling.set(null);
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
