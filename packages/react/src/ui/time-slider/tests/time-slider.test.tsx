import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { SliderBuffer } from '../../slider/slider-buffer';
import { SliderFill } from '../../slider/slider-fill';
import { SliderThumb } from '../../slider/slider-thumb';
import { SliderTrack } from '../../slider/slider-track';
import { SliderValue } from '../../slider/slider-value';
import { TimeSliderRoot } from '../time-slider-root';

// --- Hoisted mock data (available inside vi.mock factories) ---

const { mockSliderApi, mockTimeState, mockBufferState, mockPlaybackState, capturedSliderOptions } = vi.hoisted(() => {
  const capturedSliderOptions: { current: { onDragStart?: () => void; onDragEnd?: () => void } } = {
    current: {},
  };
  return {
    mockSliderApi: (options: { onDragStart?: () => void; onDragEnd?: () => void }) => {
      capturedSliderOptions.current = options;
      return {
        input: {
          current: {
            pointerPercent: 0,
            dragPercent: 0,
            dragging: false,
            pointing: false,
            focused: false,
          },
          subscribe: vi.fn(() => vi.fn()),
        },
        rootProps: {
          onPointerDown: vi.fn(),
          onPointerMove: vi.fn(),
          onPointerLeave: vi.fn(),
        },
        thumbProps: {
          onKeyDown: vi.fn(),
          onFocus: vi.fn(),
          onBlur: vi.fn(),
        },
        adjustForAlignment: <S,>(state: S): S => state,
        destroy: vi.fn(),
      };
    },
    mockTimeState: {
      currentTime: 30,
      duration: 120,
      seeking: false,
      seek: vi.fn(),
    },
    mockBufferState: {
      buffered: [[0, 60]] as [number, number][],
      seekable: [[0, 120]] as [number, number][],
    },
    mockPlaybackState: {
      paused: false,
      ended: false,
      started: true,
      waiting: false,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    },
    capturedSliderOptions,
  };
});

// --- Module mocks ---

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const orig: Record<string, unknown> = await importOriginal();
  return { ...orig, createSlider: vi.fn(mockSliderApi) };
});

vi.mock('@videojs/store/react', () => ({
  useSnapshot: vi.fn((state: { current: unknown }) => state.current),
  useStore: vi.fn((_store: unknown, selector?: (state: object) => unknown) => {
    if (!selector) return _store;
    try {
      const result = selector({ time: mockTimeState, buffer: mockBufferState, playback: mockPlaybackState });
      if (result !== undefined) return result;
    } catch {
      // fall through
    }
    try {
      return selector({ ...mockTimeState, ...mockBufferState, ...mockPlaybackState });
    } catch {
      return undefined;
    }
  }),
}));

afterEach(cleanup);

// --- Tests ---

describe('TimeSliderRoot', () => {
  it('renders a div element', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot />
      </Wrapper>
    );
    const el = container.querySelector('div > div');

    expect(el).toBeTruthy();
    expect(el?.tagName).toBe('DIV');
  });

  it('forwards ref to the root element', () => {
    const { Wrapper } = createPlayerWrapper();
    const ref = createRef<HTMLDivElement>();
    render(
      <Wrapper>
        <TimeSliderRoot ref={ref} />
      </Wrapper>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spreads additional props', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot data-testid="time-slider" />
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="time-slider"]')).toBeTruthy();
  });

  it('sets data-orientation to horizontal', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot />
      </Wrapper>
    );

    const el = container.querySelector('[data-orientation]');
    expect(el?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('sets slider CSS custom properties', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot />
      </Wrapper>
    );

    const el = container.querySelector('[data-orientation]') as HTMLElement;
    expect(el?.style.getPropertyValue('--media-slider-fill')).toBeTruthy();
    expect(el?.style.getPropertyValue('--media-slider-pointer')).toBeTruthy();
    expect(el?.style.getPropertyValue('--media-slider-buffer')).toBeTruthy();
  });
});

describe('TimeSlider compound', () => {
  it('renders all parts together', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot data-testid="root">
          <SliderTrack data-testid="track">
            <SliderFill data-testid="fill" />
            <SliderBuffer data-testid="buffer" />
            <SliderThumb data-testid="thumb" />
          </SliderTrack>
          <SliderValue data-testid="value" />
        </TimeSliderRoot>
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="root"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="track"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="fill"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="buffer"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="thumb"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="value"]')).toBeTruthy();
  });

  it('thumb receives ARIA attributes from TimeSliderCore', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot>
          <SliderThumb data-testid="thumb" />
        </TimeSliderRoot>
      </Wrapper>
    );

    const thumb = container.querySelector('[data-testid="thumb"]');
    expect(thumb?.getAttribute('role')).toBe('slider');
    expect(thumb?.getAttribute('aria-label')).toBe('Seek');
  });

  it('SliderValue displays formatted time', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <TimeSliderRoot>
          <SliderValue data-testid="value" />
        </TimeSliderRoot>
      </Wrapper>
    );

    const output = container.querySelector('[data-testid="value"]');
    expect(output?.textContent).toBeTruthy();
  });
});

describe('TimeSliderRoot pauseOnDrag', () => {
  it('does nothing when pauseOnDrag is false (default)', () => {
    mockPlaybackState.paused = false;
    mockPlaybackState.play.mockClear();
    mockPlaybackState.pause.mockClear();

    const { Wrapper } = createPlayerWrapper();
    render(
      <Wrapper>
        <TimeSliderRoot />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(mockPlaybackState.pause).not.toHaveBeenCalled();

    capturedSliderOptions.current.onDragEnd?.();
    expect(mockPlaybackState.play).not.toHaveBeenCalled();
  });

  it('pauses on drag-start and resumes on drag-end when playing', () => {
    mockPlaybackState.paused = false;
    mockPlaybackState.play.mockClear();
    mockPlaybackState.pause.mockClear();

    const { Wrapper } = createPlayerWrapper();
    render(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(mockPlaybackState.pause).toHaveBeenCalledTimes(1);

    capturedSliderOptions.current.onDragEnd?.();
    expect(mockPlaybackState.play).toHaveBeenCalledTimes(1);
  });

  it('does not resume on drag-end when player was already paused', () => {
    mockPlaybackState.paused = true;
    mockPlaybackState.play.mockClear();
    mockPlaybackState.pause.mockClear();

    const { Wrapper } = createPlayerWrapper();
    render(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(mockPlaybackState.pause).not.toHaveBeenCalled();

    capturedSliderOptions.current.onDragEnd?.();
    expect(mockPlaybackState.play).not.toHaveBeenCalled();
  });

  it('forwards user-provided onDragStart and onDragEnd', () => {
    mockPlaybackState.paused = false;
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    const { Wrapper } = createPlayerWrapper();
    render(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag onDragStart={onDragStart} onDragEnd={onDragEnd} />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(onDragStart).toHaveBeenCalled();

    capturedSliderOptions.current.onDragEnd?.();
    expect(onDragEnd).toHaveBeenCalled();
  });

  it('resumes on drag-end even if pauseOnDrag is turned off mid-drag', () => {
    mockPlaybackState.paused = false;
    mockPlaybackState.play.mockClear();
    mockPlaybackState.pause.mockClear();

    const { Wrapper } = createPlayerWrapper();
    const { rerender } = render(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(mockPlaybackState.pause).toHaveBeenCalledTimes(1);

    rerender(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag={false} />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragEnd?.();
    expect(mockPlaybackState.play).toHaveBeenCalledTimes(1);
  });

  it('resumes on unmount if a drag paused playback', () => {
    mockPlaybackState.paused = false;
    mockPlaybackState.play.mockClear();
    mockPlaybackState.pause.mockClear();

    const { Wrapper } = createPlayerWrapper();
    const { unmount } = render(
      <Wrapper>
        <TimeSliderRoot pauseOnDrag />
      </Wrapper>
    );

    capturedSliderOptions.current.onDragStart?.();
    expect(mockPlaybackState.pause).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockPlaybackState.play).toHaveBeenCalledTimes(1);
  });
});
