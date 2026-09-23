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
    const markup = renderToString(
      <JSPickerClient currentFramework="html" route="html">
        <aside data-aside="note">
          CDN is available for HTML. <a href="#choose-how-to-install">Choose how to install</a>
        </aside>
      </JSPickerClient>
    );

    expect(markup).toContain('data-aside="note"');
    expect(markup).toContain('CDN is available for HTML');
    expect(markup).toContain('href="#choose-how-to-install"');
    expect(markup).toContain('CDN');
  });

  it('does not repeat the CDN note on the CDN guide', () => {
    const markup = renderToString(
      <JSPickerClient currentFramework="html" route="cdn">
        <aside data-aside="note">CDN is available for HTML.</aside>
      </JSPickerClient>
    );

    expect(markup).not.toContain('data-aside="note"');
  });

  it('hides the CDN note when a non-HTML framework is selected', () => {
    const markup = renderToString(
      <JSPickerClient currentFramework="react" route="react">
        <aside data-aside="note">CDN is available for HTML.</aside>
      </JSPickerClient>
    );

    expect(markup).not.toContain('data-aside="note"');
  });
});
