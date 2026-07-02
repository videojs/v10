import { cleanup, fireEvent, render } from '@testing-library/react';
import type { SeekIndicatorCore, StatusIndicatorCore, VolumeIndicatorCore } from '@videojs/core';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { SeekIndicator } from '../../seek-indicator';
import { SeekIndicatorProvider } from '../../seek-indicator/context';
import { StatusAnnouncer } from '../../status-announcer/status-announcer';
import { StatusIndicator } from '../../status-indicator';
import { StatusIndicatorProvider } from '../../status-indicator/context';
import { VolumeIndicator } from '../../volume-indicator';
import { VolumeIndicatorProvider } from '../../volume-indicator/context';
import { useIndicatorVisibility } from '../use-indicator-visibility';

afterEach(cleanup);

describe('input indicators', () => {
  it('renders status values from the nearest status item context', () => {
    const state: StatusIndicatorCore.State = {
      open: true,
      generation: 1,
      status: 'captions-on',
      label: 'Captions on',
      value: null,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <StatusIndicatorProvider value={{ state }}>
        <StatusIndicator.Value data-testid="value" />
      </StatusIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('Captions on');
  });

  it('uses implicit StatusAnnouncer live-region semantics without rendering text content', () => {
    const { getByRole } = renderWithPlayer(<StatusAnnouncer />);

    expect(getByRole('status').hasAttribute('aria-live')).toBe(false);
    expect(getByRole('status').textContent).toBe('');
  });

  it('scopes the volume CSS variable to VolumeIndicator.Fill', () => {
    const state: VolumeIndicatorCore.State = {
      open: true,
      generation: 1,
      level: 'high',
      value: '60%',
      fill: '60%',
      min: false,
      max: false,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <VolumeIndicatorProvider value={{ state }}>
        <div data-testid="root">
          <VolumeIndicator.Fill data-testid="fill">
            <VolumeIndicator.Value data-testid="value" />
          </VolumeIndicator.Fill>
        </div>
      </VolumeIndicatorProvider>
    );

    expect(getByTestId('root').style.getPropertyValue('--media-volume-fill')).toBe('');
    expect(getByTestId('fill').style.getPropertyValue('--media-volume-fill')).toBe('60%');
    expect(getByTestId('value').textContent).toBe('60%');
  });

  it('keeps seek value content populated while mounted', () => {
    const state: SeekIndicatorCore.State = {
      open: true,
      generation: 1,
      direction: 'forward',
      count: 1,
      seekTotal: 10,
      value: null,
      currentTime: '0:30',
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <SeekIndicatorProvider value={{ state }}>
        <SeekIndicator.Value data-testid="value" />
      </SeekIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('0:30');
  });

  it('closes the previous visual indicator when a new one is shown', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const { getByTestId } = renderWithPlayer(
      <>
        <VisibilityProbe close={firstClose} id="first" />
        <VisibilityProbe close={secondClose} id="second" />
      </>
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

function renderWithPlayer(ui: ReactNode) {
  const container = document.createElement('div');
  const playerContextValue = {
    store: {
      state: {},
      subscribe: () => () => {},
    },
    media: null,
    setMedia: vi.fn(),
    container,
    setContainer: vi.fn(),
  } as unknown as PlayerContextValue;

  return render(<PlayerContextProvider value={playerContextValue}>{ui}</PlayerContextProvider>);
}
