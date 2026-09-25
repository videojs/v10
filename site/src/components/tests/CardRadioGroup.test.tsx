import { act, waitFor } from '@testing-library/react';
import { atom } from 'nanostores';
import { useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

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
      aria-label="Select framework"
    />
  );
}

describe('CardRadioGroup', () => {
  let root: Root | null = null;

  afterEach(async () => {
    if (root) await act(() => root?.unmount());

    root = null;
    framework.set('html');
    vi.restoreAllMocks();
  });

  it('shows the server selection, then the store selection once hydrated', async () => {
    const container = document.createElement('div');

    container.innerHTML = renderToString(<FrameworkPicker />);

    const serverSelection = container.querySelector('[role="radio"][aria-checked="true"]');

    expect(serverSelection).toHaveTextContent('React');
    expect(serverSelection).toHaveClass('ring-accent');
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);

    const errors = vi.spyOn(console, 'error');

    await act(async () => {
      root = hydrateRoot(container, <FrameworkPicker />);
    });

    await waitFor(() =>
      expect(container.querySelector('[role="radio"][aria-checked="true"]')).toHaveTextContent('HTML')
    );

    expect(container.querySelector('[role="radio"].ring-accent')).toHaveTextContent('HTML');
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });
});
