import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { registryFramework } from '@/stores/registry';

vi.mock('@/components/CardRadioGroup', () => ({
  default: ({ options, value }: { options: { value: string }[]; value: string }) => (
    <span data-options={options.map((option) => option.value).join(',')} data-testid="framework">
      {value}
    </span>
  ),
}));

import JSPickerClient from './JSPickerClient';

describe('JSPickerClient', () => {
  afterEach(() => registryFramework.set('react'));

  it('shows every framework on every installation route', () => {
    const markup = renderToString(<JSPickerClient currentFramework="html" route="cdn" />);

    expect(markup).toContain('data-options="react,html,vue,svelte"');
    expect(markup).toContain('data-testid="framework">html</span>');
  });

  it('uses the query-initialized registry selection on Shadcn', () => {
    registryFramework.set('html');

    expect(renderToString(<JSPickerClient currentFramework="react" route="shadcn" />)).toContain(
      'data-testid="framework">html</span>'
    );
  });
});
