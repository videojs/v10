import { act } from '@testing-library/react';
import { atom } from 'nanostores';
import { useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import CardRadioGroup from '../CardRadioGroup';

const framework = atom<'html' | 'react'>('html');

function FrameworkPicker() {
  const value = useSyncExternalStore(
    (onChange) => framework.listen(onChange),
    () => framework.get(),
    () => 'react'
  );

  return (
    <CardRadioGroup
      value={value}
      onChange={framework.set}
      options={[
        { value: 'react', label: 'React', media: <span /> },
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

  it('stays marked as hydrating until the client selection replaces the server selection', async () => {
    const container = document.createElement('div');

    container.innerHTML = renderToString(<FrameworkPicker />);

    const serverGroup = container.querySelector('[role="radiogroup"]');

    expect(serverGroup).toHaveAttribute('data-installation-hydrating');
    expect(container.querySelector('[role="radio"][aria-checked="true"]')).toHaveTextContent('React');

    await act(async () => {
      root = hydrateRoot(container, <FrameworkPicker />);
    });

    const clientGroup = container.querySelector('[role="radiogroup"]');

    expect(clientGroup).not.toHaveAttribute('data-installation-hydrating');
    expect(container.querySelector('[role="radio"][aria-checked="true"]')).toHaveTextContent('HTML');
  });
});
