import { act, waitFor } from '@testing-library/react';
import { atom } from 'nanostores';
import { useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import CardRadioGroup from '../CardRadioGroup';

const framework = atom<'html' | 'react'>('html');

function FrameworkPicker() {
  const value = useSyncExternalStore<'html' | 'react'>(
    (onChange) => framework.listen(onChange),
    () => framework.get(),
    () => 'react'
  );

  return (
    <CardRadioGroup
      value={value}
      onChange={framework.set}
      options={[
        {
          value: 'react',
          label: 'React',
          media: <span />,
        },
        { value: 'html', label: 'HTML', media: <span /> },
      ]}
      aria-label="Select JS framework"
    />
  );
}

describe('CardRadioGroup', () => {
  let root: Root | null = null;

  afterEach(async () => {
    if (root) await act(() => root?.unmount());

    root = null;
    framework.set('html');
  });

  it('keeps every card visible while the URL-backed selection hydrates', async () => {
    const container = document.createElement('div');

    container.innerHTML = renderToString(<FrameworkPicker />);

    const serverGroup = container.querySelector('[role="radiogroup"]');

    const serverSelection = container.querySelector('[role="radio"][aria-checked="true"]');

    expect(serverGroup).not.toHaveAttribute('data-selection-ready');
    expect(serverSelection).toHaveTextContent('React');
    expect(serverSelection).toHaveClass('ring-transparent');
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);

    await act(async () => {
      root = hydrateRoot(container, <FrameworkPicker />);
    });

    expect(container.querySelector('[role="radio"].ring-accent')).toBeNull();

    await waitFor(() => expect(container.querySelector('[role="radiogroup"]')).toHaveAttribute('data-selection-ready'));

    const clientSelection = container.querySelector('[role="radio"][aria-checked="true"]');

    expect(clientSelection).toHaveTextContent('HTML');
    expect(clientSelection).toHaveClass('ring-accent');
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);
  });
});
