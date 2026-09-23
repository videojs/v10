import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { registryProjectFramework } from '@/stores/registry';

vi.mock('@/components/CardRadioGroup', () => ({
  default: ({ options, value }: { options: { value: string }[]; value: string }) => (
    <span data-options={options.map((option) => option.value).join(',')} data-testid="framework">
      {value}
    </span>
  ),
}));

import JSPickerClient from './JSPickerClient';

describe('JSPickerClient', () => {
  afterEach(() => {
    registryProjectFramework.set('react');
  });

  it('shows every framework on every installation route', () => {
    const markup = renderToString(<JSPickerClient currentFramework="html" route="cdn" />);

    expect(markup).toContain('data-options="react,html,vue,svelte"');
    expect(markup).toContain('data-testid="framework">html</span>');
  });

  it('prerenders one picker from the Shadcn route while the client store hydrates', () => {
    registryProjectFramework.set('html');
    const markup = renderToString(<JSPickerClient currentFramework="react" route="shadcn" />);

    expect(markup).toContain('data-testid="framework">react</span>');
    expect(markup.match(/data-testid="framework"/g)).toHaveLength(1);
  });

  it('points HTML readers to the CDN choice below', () => {
    const markup = renderToString(<JSPickerClient currentFramework="html" route="html" />);

    expect(markup).toContain('href="#choose-how-to-install"');
    expect(markup).toContain('CDN');
  });
});
