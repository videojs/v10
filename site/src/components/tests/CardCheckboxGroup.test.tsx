import { act, waitFor } from '@testing-library/react';
import { atom } from 'nanostores';
import { useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import CardCheckboxGroup from '../CardCheckboxGroup';

const extensions = atom<readonly ('cast' | 'data')[]>(['data']);
const serverExtensions: readonly ('cast' | 'data')[] = [];

function ExtensionPicker() {
  const value = useSyncExternalStore(
    (onChange) => extensions.listen(onChange),
    () => extensions.get(),
    () => serverExtensions
  );

  return (
    <CardCheckboxGroup
      value={value}
      onChange={extensions.set}
      options={[
        { value: 'cast', label: 'Cast', media: <span /> },
        { value: 'data', label: 'Data', media: <span /> },
      ]}
      aria-label="Select extensions"
    />
  );
}

describe('CardCheckboxGroup', () => {
  let root: Root | null = null;

  afterEach(async () => {
    if (root) await act(() => root?.unmount());

    root = null;
    extensions.set(['data']);
    vi.restoreAllMocks();
  });

  it('shows the server selection, then the store selection once hydrated', async () => {
    const container = document.createElement('div');

    container.innerHTML = renderToString(<ExtensionPicker />);

    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
    expect(container.querySelector('[role="checkbox"].ring-accent')).toBeNull();

    const errors = vi.spyOn(console, 'error');

    await act(async () => {
      root = hydrateRoot(container, <ExtensionPicker />);
    });

    await waitFor(() =>
      expect(container.querySelector('[role="checkbox"][aria-checked="true"]')).toHaveTextContent('Data')
    );

    expect(container.querySelector('[role="checkbox"].ring-accent')).toHaveTextContent('Data');
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });
});
