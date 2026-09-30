import { cleanup, render, waitFor } from '@testing-library/react';
import { DEFAULT_SEEK_STEP } from '@videojs/core';
import { getGestureCoordinator } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { createMockStore } from '../../../testing/mocks';
import { Gesture } from '../component';

afterEach(cleanup);

function createContextValue(container: HTMLElement): PlayerContextValue {
  return {
    store: createMockStore() as any,
    media: null,
    setMedia: vi.fn(),
    container,
    setContainer: vi.fn(),
  };
}

function Wrapper({ children, value }: { children: ReactNode; value: PlayerContextValue }) {
  return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
}

describe('Gesture', () => {
  it('preserves the tap claim when disabled', () => {
    const container = document.createElement('div');
    const value = createContextValue(container);

    render(
      <Wrapper value={value}>
        <Gesture type="tap" action="toggleControls" pointer="touch" disabled />
      </Wrapper>
    );

    const event = new MouseEvent('pointerup', { bubbles: true });

    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    container.dispatchEvent(event);

    // SAFETY: This MouseEvent carries the pointerType read by claimsTap.
    expect(getGestureCoordinator(container).claimsTap(event as PointerEvent, 'toggleControls')).toBe(true);
  });

  it('defaults a left seek gesture to the backward step', async () => {
    const container = document.createElement('div');
    const value = createContextValue(container);

    render(
      <Wrapper value={value}>
        <Gesture type="doubletap" action="seekStep" region="left" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(getGestureCoordinator(container).bindings).toEqual([
        expect.objectContaining({ action: 'seekStep', region: 'left', value: -DEFAULT_SEEK_STEP }),
      ]);
    });
  });
});
