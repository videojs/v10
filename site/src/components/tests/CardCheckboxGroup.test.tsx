import { act, waitFor } from '@testing-library/react';
import { atom } from 'nanostores';
import { useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import CardCheckboxGroup from '../CardCheckboxGroup';

const extensions = atom<readonly ('cast' | 'data')[]>(['data']);

function ExtensionPicker() {
  const value = useSyncExternalStore(
    (onChange) => extensions.listen(onChange),
    () => extensions.get(),
    () => []
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
  });

  it('keeps every card stable while URL-backed selections hydrate', async () => {
    const container = document.createElement('div');

    container.innerHTML = renderToString(<ExtensionPicker />);

    expect(container.querySelector('[role="group"]')).not.toHaveAttribute('data-selection-ready');
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
    expect(container.querySelector('[role="checkbox"].ring-accent')).toBeNull();

    await act(async () => {
      root = hydrateRoot(container, <ExtensionPicker />);
    });

    await waitFor(() => expect(container.querySelector('[role="group"]')).toHaveAttribute('data-selection-ready'));

    expect(container.querySelector('[role="checkbox"][aria-checked="true"]')).toHaveTextContent('Data');
    expect(container.querySelector('[role="checkbox"].ring-accent')).toHaveTextContent('Data');
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
  });
});
