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
  default: ({
    value,
    options,
    ...props
  }: {
    value: string;
    options: { description?: string; label: string }[];
    'aria-label': string;
  }) => (
    <span
      data-label={props['aria-label']}
      data-options={options.map(({ label }) => label).join(',')}
      data-descriptions={options.flatMap(({ description }) => (description ? [description] : [])).join(',')}
    >
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

    expect(templateMarkup).toContain('data-label="Select app"');
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

    expect(vueMarkup).toContain('data-options="Vite,Astro,Nuxt"');
    expect(svelteMarkup).toContain('data-options="Vite,Astro,SvelteKit"');
  });

  it('offers no scaffold for packaged HTML but requires a concrete Shadcn setup', () => {
    const packaged = renderToString(
      <RegistryOptionsClient framework="html" installation={false} kind="template" method="packaged" />
    );
    const shadcn = renderToString(
      <RegistryOptionsClient framework="html" installation={false} kind="template" method="shadcn" />
    );

    expect(packaged).toContain('data-options="Vite,Astro,Laravel,Existing site"');
    expect(packaged).toContain(
      'data-descriptions="Fast app and development server,Content-focused sites with islands,Laravel app with Vite assets,Existing site whose build bundles JavaScript"'
    );
    expect(shadcn).toContain('data-options="Vite,Astro,Laravel"');
  });

  it('renders the Shadcn styling choice as cards for the source catalog', () => {
    registryStyling.set('css');

    const react = renderToString(<RegistryOptionsClient framework="react" installation kind="styling" />);
    const html = renderToString(<RegistryOptionsClient framework="html" installation kind="styling" />);

    expect(react).toContain('data-label="Select styling"');
    expect(react).toContain('data-options="Vanilla CSS,Tailwind CSS"');
    expect(react).toContain('>tailwind</span>');
    expect(html).toContain('data-options="Vanilla CSS"');
  });
});
