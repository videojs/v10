import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import { Select } from '@/components/Select';
import { registryFramework, registryStyling, registryTemplate } from '@/stores/registry';
import { defaultRegistryTemplate, type RegistryFramework } from '@/utils/installation/shadcn';

const ICONS = {
  react: <ReactLogo className="size-4" />,
  html: <Html5Logo className="size-4" />,
} satisfies Record<RegistryFramework, ReactNode>;

const OPTIONS = (['react', 'html'] as const).map((value) => ({
  value,
  label: value === 'react' ? 'React' : 'HTML',
  icon: ICONS[value],
}));

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

  useEffect(() => updatePanels(framework), [framework]);

  const handleChange = (next: RegistryFramework | null) => {
    if (!next || next === framework) return;

    registryFramework.set(next);
    registryTemplate.set(defaultRegistryTemplate(next));
    registryStyling.set(null);
  };

  return (
    <div className="grid gap-1.5">
      <p className="text-p4 font-medium">Player</p>
      <Select
        value={framework}
        onChange={handleChange}
        options={OPTIONS}
        aria-label="Select player"
        className="justify-self-start"
      />
    </div>
  );
}
