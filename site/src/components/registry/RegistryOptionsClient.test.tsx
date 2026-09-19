import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { registrySkin, registryStyling, registryTemplate, registryTheme } from '@/stores/registry';

vi.mock('@/components/Select', () => ({
  Select: ({ value, ...props }: { value: string; 'aria-label': string }) => (
    <span data-label={props['aria-label']}>{value}</span>
  ),
}));

import RegistryOptionsClient from './RegistryOptionsClient';

describe('RegistryOptionsClient', () => {
  afterEach(() => {
    registrySkin.set(null);
    registryStyling.set(null);
    registryTemplate.set(null);
    registryTheme.set(null);
  });

  it('uses route defaults for server markup when client selections differ', () => {
    registrySkin.set('audio');
    registryStyling.set('css');
    registryTemplate.set('vite');
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

    expect(templateMarkup).toContain('data-label="Select project template">next</span>');
    expect(catalogMarkup).toContain('data-label="Select skin">video</span>');
    expect(catalogMarkup).toContain('data-label="Select styling">tailwind</span>');
    expect(catalogMarkup).toContain('data-label="Select theme">default</span>');
  });
});
