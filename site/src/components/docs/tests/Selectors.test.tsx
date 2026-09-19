import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { currentFramework, currentStyle } from '@/stores/preferences';
import { registryFramework } from '@/stores/registry';

vi.mock('@/components/Select', () => ({
  Select: ({
    value,
    onChange,
    ...props
  }: {
    value: string;
    onChange: (value: string) => void;
    'data-testid': string;
  }) => (
    <button
      type="button"
      data-testid={props['data-testid']}
      onClick={() => onChange(value === 'react' ? 'html' : 'react')}
    >
      {value}
    </button>
  ),
}));

import { Selectors } from '../Selectors';

describe('Selectors', () => {
  afterEach(() => {
    cleanup();
    currentFramework.set(null);
    currentStyle.set(null);
    registryFramework.set('react');
    vi.restoreAllMocks();
  });

  it('uses route defaults for server markup when client preferences differ', () => {
    currentFramework.set('html');
    currentStyle.set('css');

    const markup = renderToString(
      <Selectors currentFramework="react" currentSlug="guides/installation-shadcn" registryFrameworkSelection />
    );

    expect(markup).toContain('data-testid="select-framework"');
    expect(markup).toContain('>react</button>');
    expect(markup).toContain('data-testid="select-style"');
    expect(markup).toContain('>css</button>');
  });

  it('moves focus to the visible framework selector when the Shadcn framework changes', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    const { getAllByTestId } = render(
      <>
        <Selectors currentFramework="react" currentSlug="guides/installation-shadcn" registryFrameworkSelection />
        <Selectors currentFramework="html" currentSlug="guides/installation-shadcn" registryFrameworkSelection />
      </>
    );
    const [reactSelector, htmlSelector] = getAllByTestId('select-framework');
    const hiddenRects = Object.assign([], { item: () => null }) satisfies DOMRectList;
    const visibleRect = htmlSelector!.getBoundingClientRect();
    const visibleRects = Object.assign([visibleRect], {
      item: (index: number) => (index === 0 ? visibleRect : null),
    }) satisfies DOMRectList;

    vi.spyOn(reactSelector!, 'getClientRects').mockReturnValue(hiddenRects);
    vi.spyOn(htmlSelector!, 'getClientRects').mockReturnValue(visibleRects);

    reactSelector!.focus();
    fireEvent.click(reactSelector!);

    expect(registryFramework.get()).toBe('html');
    expect(htmlSelector).toHaveFocus();
  });
});
