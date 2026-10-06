import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { framework } from '@/stores/installation';

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
    framework.set('react');
  });

  it('shows every framework on packaged and CDN installation routes', () => {
    const markup = renderToString(<JSPickerClient currentFramework="html" route="cdn" />);

    expect(markup).toContain('data-options="react,html,vue,svelte"');
    expect(markup).toContain('data-testid="framework">html</span>');
  });

  it('offers only frameworks with Shadcn source on the Shadcn route', () => {
    const markup = renderToString(<JSPickerClient currentFramework="react" route="shadcn" />);

    expect(markup).toContain('data-options="react,html"');
  });

  it('prerenders one picker from the Shadcn route while the client store hydrates', () => {
    framework.set('html');
    const markup = renderToString(<JSPickerClient currentFramework="react" route="shadcn" />);

    expect(markup).toContain('data-testid="framework">react</span>');
    expect(markup.match(/data-testid="framework"/g)).toHaveLength(1);
  });
});
