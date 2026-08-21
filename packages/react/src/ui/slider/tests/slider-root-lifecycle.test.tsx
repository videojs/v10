import { cleanup, render } from '@testing-library/react';
import type { SliderOptions } from '@videojs/core/dom';
import { Component, type ErrorInfo, type ReactNode, useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { TimeSliderRoot } from '../../time-slider/time-slider-root';
import { VolumeSliderRoot } from '../../volume-slider/volume-slider-root';
import { type SliderContextValue, useSliderContext } from '../context';
import { SliderRoot } from '../slider-root';

const { capturedOptions, featureState, sliderInput } = vi.hoisted(() => ({
  capturedOptions: { current: undefined as SliderOptions | undefined },
  sliderInput: {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  },
  featureState: {
    current: {} as Record<string, unknown>,
  },
}));

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal();
  return {
    ...original,
    createSlider: vi.fn((options: SliderOptions) => {
      capturedOptions.current = options;
      return {
        input: {
          current: sliderInput,
          subscribe: vi.fn(() => vi.fn()),
        },
        rootProps: {
          onPointerDown: vi.fn(),
          onPointerMove: vi.fn(),
          onPointerUp: vi.fn(),
          onPointerLeave: vi.fn(),
          onLostPointerCapture: vi.fn(),
        },
        rootStyle: { touchAction: 'none', userSelect: 'none' },
        thumbProps: {
          onKeyDown: vi.fn(),
          onFocus: vi.fn(),
          onBlur: vi.fn(),
        },
        adjustForAlignment: <State,>(state: State): State => state,
        destroy: vi.fn(),
      };
    }),
  };
});

vi.mock('@videojs/store/react', () => ({
  useSnapshot: vi.fn(
    (state: { current: object }, selector?: (snapshot: object) => unknown) => selector?.(state.current) ?? state.current
  ),
  useStore: vi.fn((_store: unknown, selector?: (snapshot: object) => unknown) => {
    if (!selector) return _store;
    const flat = Object.assign({}, ...Object.values(featureState.current));
    return selector(flat);
  }),
}));

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

let committedContext: SliderContextValue | undefined;

function CaptureContext({ abandon = false }: { abandon?: boolean }) {
  const context = useSliderContext();

  useLayoutEffect(() => {
    committedContext = context;
  }, [context]);

  if (abandon) throw new Error('abandon slider render');
  return null;
}

afterEach(() => {
  cleanup();
  committedContext = undefined;
  capturedOptions.current = undefined;
  featureState.current = {};
  Object.assign(sliderInput, {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  });
  vi.restoreAllMocks();
});

describe('slider root committed state', () => {
  it('keeps base slider handlers and attributes on committed props after an abandoned render', () => {
    const onCommittedChange = vi.fn();
    const onAbandonedChange = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Boundary>
        <SliderRoot label="Committed" min={0} max={100} step={10} value={20} onValueChange={onCommittedChange}>
          <CaptureContext />
        </SliderRoot>
      </Boundary>
    );
    const options = capturedOptions.current!;
    const context = committedContext!;

    rerender(
      <Boundary>
        <SliderRoot label="Abandoned" min={100} max={200} step={50} value={150} onValueChange={onAbandonedChange}>
          <CaptureContext abandon />
        </SliderRoot>
      </Boundary>
    );

    options.onValueChange?.(30);
    const attrs = context.getAttrs(context.state, { pointerPercent: 20, pointerValue: 20 });

    expect(options.getStepPercent()).toBe(10);
    expect(onCommittedChange).toHaveBeenCalledWith(30);
    expect(onAbandonedChange).not.toHaveBeenCalled();
    expect(attrs).toMatchObject({ 'aria-label': 'Committed', 'aria-valuemin': 0, 'aria-valuemax': 100 });
    consoleError.mockRestore();
  });

  it('keeps time slider mapping, drag policy, and attributes on committed props', () => {
    const seek = vi.fn(() => Promise.resolve(0));
    const pause = vi.fn();
    const onCommittedDrag = vi.fn();
    const onAbandonedDrag = vi.fn();
    featureState.current = {
      time: { currentTime: 30, duration: 120, seeking: false, seek },
      buffer: { buffered: [[0, 60]], seekable: [[0, 120]] },
      playback: { paused: false, ended: false, started: true, waiting: false, play: vi.fn(), pause },
    };
    const { Wrapper } = createPlayerWrapper();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Boundary>
        <Wrapper>
          <TimeSliderRoot label="Committed time" step={10} pauseOnDrag={false} onDragStart={onCommittedDrag}>
            <CaptureContext />
          </TimeSliderRoot>
        </Wrapper>
      </Boundary>
    );
    const options = capturedOptions.current!;
    const context = committedContext!;

    rerender(
      <Boundary>
        <Wrapper>
          <TimeSliderRoot label="Abandoned time" step={60} pauseOnDrag onDragStart={onAbandonedDrag}>
            <CaptureContext abandon />
          </TimeSliderRoot>
        </Wrapper>
      </Boundary>
    );

    options.onValueCommit?.(50);
    options.onDragStart?.();
    const attrs = context.getAttrs(context.state, { pointerPercent: 25, pointerValue: 30 });

    expect(options.getStepPercent()).toBeCloseTo((10 / 120) * 100, 5);
    expect(seek).toHaveBeenCalledWith(60);
    expect(pause).not.toHaveBeenCalled();
    expect(onCommittedDrag).toHaveBeenCalledOnce();
    expect(onAbandonedDrag).not.toHaveBeenCalled();
    expect(attrs).toMatchObject({ 'aria-label': 'Committed time', 'aria-valuemax': 120 });
    consoleError.mockRestore();
  });

  it('keeps volume slider handlers and attributes on committed props', () => {
    const onCommittedDrag = vi.fn();
    const onAbandonedDrag = vi.fn();
    featureState.current = {
      volume: {
        volume: 0.8,
        muted: false,
        volumeAvailability: 'available',
        setVolume: vi.fn(),
        toggleMuted: vi.fn(),
      },
    };
    const { Wrapper } = createPlayerWrapper();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Boundary>
        <Wrapper>
          <VolumeSliderRoot label="Committed volume" step={10} onDragStart={onCommittedDrag}>
            <CaptureContext />
          </VolumeSliderRoot>
        </Wrapper>
      </Boundary>
    );
    const options = capturedOptions.current!;
    const context = committedContext!;

    rerender(
      <Boundary>
        <Wrapper>
          <VolumeSliderRoot label="Abandoned volume" step={40} onDragStart={onAbandonedDrag}>
            <CaptureContext abandon />
          </VolumeSliderRoot>
        </Wrapper>
      </Boundary>
    );

    options.onDragStart?.();
    const attrs = context.getAttrs(context.state, { pointerPercent: 80, pointerValue: 80 });

    expect(options.getStepPercent()).toBe(10);
    expect(onCommittedDrag).toHaveBeenCalledOnce();
    expect(onAbandonedDrag).not.toHaveBeenCalled();
    expect(attrs).toMatchObject({ 'aria-label': 'Committed volume', 'aria-valuenow': 80 });
    consoleError.mockRestore();
  });
});
