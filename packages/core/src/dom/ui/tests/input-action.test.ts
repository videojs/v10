import { describe, expect, it, vi } from 'vitest';

import {
  getIndicatorVisibilityCoordinator,
  getMediaSnapshot,
  type MediaSnapshotStore,
  toInputActionEvent,
} from '../input-action';

function mockStore(state: Record<string, unknown>): MediaSnapshotStore {
  return { state };
}

describe('input-action', () => {
  it('converts coordinator events to input action events', () => {
    expect(
      toInputActionEvent({
        source: 'hotkey',
        action: 'togglePaused',
        value: 1,
        event: new KeyboardEvent('keydown', { key: 'k' }),
      })
    ).toEqual({
      source: 'hotkey',
      action: 'togglePaused',
      value: 1,
      key: 'k',
    });
  });

  it('derives media snapshots from player store selectors', () => {
    expect(
      getMediaSnapshot(
        mockStore({
          chaptersCues: [],
          paused: true,
          volume: 0.5,
          muted: false,
          fullscreen: true,
          subtitlesShowing: true,
          pip: false,
          currentTime: 30,
          duration: 120,
        })
      )
    ).toEqual({
      paused: true,
      volume: 0.5,
      muted: false,
      fullscreen: true,
      subtitlesShowing: true,
      pip: false,
      currentTime: 30,
      duration: 120,
    });
  });

  it('shares a visibility coordinator per container', () => {
    const container = document.createElement('div');
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };

    const coordinator = getIndicatorVisibilityCoordinator(container);
    coordinator.register(first);
    coordinator.register(second);
    coordinator.show(second);

    expect(getIndicatorVisibilityCoordinator(container)).toBe(coordinator);
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).not.toHaveBeenCalled();
  });
});
