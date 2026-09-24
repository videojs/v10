import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { template } from '@/stores/installation';
import { registrySkin, registryStyling, registryTheme } from '@/stores/registry';

vi.mock('@/components/Select', () => ({
  Select: ({ value, ...props }: { value: string; 'aria-label': string }) => (
    <span data-label={props['aria-label']}>{value}</span>
  ),
}));

vi.mock('@/components/CardRadioGroup', () => ({
  default: ({ value, options, ...props }: { value: string; options: { label: string }[]; 'aria-label': string }) => (
    <span data-label={props['aria-label']} data-options={options.map(({ label }) => label).join(',')}>
      {value}
    </span>
  ),
}));

import RegistryOptionsClient from './RegistryOptionsClient';

describe('RegistryOptionsClient', () => {
  afterEach(() => {
    registrySkin.set(null);
    registryStyling.set(null);
    template.set('next');
    registryTheme.set(null);
  });

  it('uses route defaults for server markup when client selections differ', () => {
    registrySkin.set('audio');
    registryStyling.set('css');
    template.set('vite');
    registryTheme.set('minimal');

    const templateMarkup = renderToString(<RegistryOptionsClient framework="react" installation kind="template" />);
    const catalogMarkup = renderToString(
      <RegistryOptionsClient
        defaultSkin="video"
        defaultTheme="default"
        framework="react"
        installation={false}
        kind="catalog"
      />
    );

    expect(templateMarkup).toContain('data-label="Select app setup"');
    expect(templateMarkup).toContain('>next</span>');
    expect(catalogMarkup).toContain('data-label="Select skin">video</span>');
    expect(catalogMarkup).toContain('data-label="Select styling">tailwind</span>');
    expect(catalogMarkup).toContain('data-label="Select theme">default</span>');
  });

  it('renders app setup choices as framework-specific cards', () => {
    const vueMarkup = renderToString(<RegistryOptionsClient framework="vue" installation={false} kind="template" />);
    const svelteMarkup = renderToString(
      <RegistryOptionsClient framework="svelte" installation={false} kind="template" />
    );

    expect(vueMarkup).toContain('data-options="Vite,Nuxt"');
    expect(svelteMarkup).toContain('data-options="Vite,SvelteKit"');
  });
});
