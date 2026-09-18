import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { currentFramework, currentStyle } from '@/stores/preferences';

vi.mock('@/components/Select', () => ({
  Select: ({ value, ...props }: { value: string; 'data-testid': string }) => (
    <span data-testid={props['data-testid']}>{value}</span>
  ),
}));

import { Selectors } from '../Selectors';

describe('Selectors', () => {
  afterEach(() => {
    currentFramework.set(null);
    currentStyle.set(null);
  });

  it('uses route defaults for server markup when client preferences differ', () => {
    currentFramework.set('html');
    currentStyle.set('css');

    const markup = renderToString(
      <Selectors currentFramework="react" currentSlug="guides/installation-shadcn" registryFrameworkSelection />
    );

    expect(markup).toContain('data-testid="select-framework">react</span>');
    expect(markup).toContain('data-testid="select-style">css</span>');
  });
});
