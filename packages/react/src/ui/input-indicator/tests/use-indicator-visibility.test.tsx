import { cleanup, fireEvent, render } from '@testing-library/react';
import type { UnknownStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { useIndicatorVisibility } from '../use-indicator-visibility';

afterEach(cleanup);

describe('useIndicatorVisibility', () => {
  it('closes the previous visual indicator when a new one is shown', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const { getByTestId } = render(
      <PlayerContextProvider value={createPlayerContextValue()}>
        <VisibilityProbe close={firstClose} id="first" />
        <VisibilityProbe close={secondClose} id="second" />
      </PlayerContextProvider>
    );

    fireEvent.click(getByTestId('second'));

    expect(firstClose).toHaveBeenCalledOnce();
    expect(secondClose).not.toHaveBeenCalled();
  });
});

function VisibilityProbe({ close, id }: { close: () => void; id: string }) {
  const show = useIndicatorVisibility(close);
  return (
    <button data-testid={id} onClick={show} type="button">
      {id}
    </button>
  );
}

function createPlayerContextValue(): PlayerContextValue {
  const store = {
    state: {},
    target: {},
    subscribe: () => () => {},
  } as unknown as UnknownStore;

  return {
    store,
    media: null,
    setMedia: vi.fn(),
    container: document.createElement('div'),
    setContainer: vi.fn(),
  } as unknown as PlayerContextValue;
}
