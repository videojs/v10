import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { template } from '@/stores/installation';

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

import AppSetupPickerClient from '../AppSetupPickerClient';

describe('AppSetupPickerClient', () => {
  afterEach(() => {
    template.set('next');
  });

  it('uses the route default for server markup when the client selection differs', () => {
    template.set('vite');

    const markup = renderToString(<AppSetupPickerClient framework="react" method="packaged" />);

    expect(markup).toContain('data-label="Select app"');
    expect(markup).toContain('>next</span>');
  });

  it('renders app setup choices as framework-specific cards', () => {
    const vueMarkup = renderToString(<AppSetupPickerClient framework="vue" method="packaged" />);
    const svelteMarkup = renderToString(<AppSetupPickerClient framework="svelte" method="packaged" />);

    expect(vueMarkup).toContain('data-options="Vite,Astro,Nuxt"');
    expect(svelteMarkup).toContain('data-options="Vite,Astro,SvelteKit"');
  });

  it('offers no scaffold for packaged HTML but requires a concrete Shadcn setup', () => {
    const packaged = renderToString(<AppSetupPickerClient framework="html" method="packaged" />);
    const shadcn = renderToString(<AppSetupPickerClient framework="html" method="shadcn" />);

    expect(packaged).toContain('data-options="Vite,Astro,Laravel,Existing site"');
    expect(packaged).toContain(
      'data-descriptions="Fast app and development server,Content-focused sites with islands,Laravel app with Vite assets,Existing site whose build bundles JavaScript"'
    );
    expect(shadcn).toContain('data-options="Vite,Astro,Laravel"');
  });
});
