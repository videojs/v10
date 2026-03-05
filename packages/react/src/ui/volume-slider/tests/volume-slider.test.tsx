import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { SliderFill } from '../../slider/slider-fill';
import { SliderThumb } from '../../slider/slider-thumb';
import { SliderTrack } from '../../slider/slider-track';
import { SliderValue } from '../../slider/slider-value';
import { VolumeSliderRoot } from '../volume-slider-root';

// --- Hoisted mock data (available inside vi.mock factories) ---

const { mockSliderApi, mockVolumeState } = vi.hoisted(() => ({
  mockSliderApi: () => ({
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
  }),
  mockVolumeState: {
    volume: 0.8,
    muted: false,
    volumeAvailability: 'available' as const,
    setVolume: vi.fn(),
    toggleMuted: vi.fn(),
  },
}));

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
      const result = selector({ volume: mockVolumeState });
      if (result !== undefined) return result;
    } catch {
      // fall through
    }
    try {
      return selector(mockVolumeState);
    } catch {
      return undefined;
    }
  }),
}));

afterEach(cleanup);

// --- Tests ---

describe('VolumeSliderRoot', () => {
  it('renders a div element', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot />
      </Wrapper>
    );

    const el = container.querySelector('[data-orientation]');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe('DIV');
  });

  it('forwards ref', () => {
    const { Wrapper } = createPlayerWrapper();
    const ref = createRef<HTMLDivElement>();
    render(
      <Wrapper>
        <VolumeSliderRoot ref={ref} />
      </Wrapper>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spreads additional props', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot data-testid="vol-slider" />
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="vol-slider"]')).toBeTruthy();
  });

  it('defaults orientation to horizontal', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot />
      </Wrapper>
    );

    const el = container.querySelector('[data-orientation]');
    expect(el?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('sets slider CSS custom properties', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot />
      </Wrapper>
    );

    const el = container.querySelector('[data-orientation]') as HTMLElement;
    expect(el?.style.getPropertyValue('--media-slider-fill')).toBeTruthy();
    expect(el?.style.getPropertyValue('--media-slider-pointer')).toBeTruthy();
  });
});

describe('VolumeSlider compound', () => {
  it('renders all parts together', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot data-testid="root">
          <SliderTrack data-testid="track">
            <SliderFill data-testid="fill" />
            <SliderThumb data-testid="thumb" />
          </SliderTrack>
          <SliderValue data-testid="value" />
        </VolumeSliderRoot>
      </Wrapper>
    );

    expect(container.querySelector('[data-testid="root"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="track"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="fill"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="thumb"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="value"]')).toBeTruthy();
  });

  it('thumb receives ARIA attributes from VolumeSliderCore', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot>
          <SliderThumb data-testid="thumb" />
        </VolumeSliderRoot>
      </Wrapper>
    );

    const thumb = container.querySelector('[data-testid="thumb"]');
    expect(thumb?.getAttribute('role')).toBe('slider');
    expect(thumb?.getAttribute('aria-label')).toBe('Volume');
  });

  it('SliderValue formats as percentage', () => {
    const { Wrapper } = createPlayerWrapper();
    const { container } = render(
      <Wrapper>
        <VolumeSliderRoot>
          <SliderValue data-testid="value" />
        </VolumeSliderRoot>
      </Wrapper>
    );

    const output = container.querySelector('[data-testid="value"]');
    expect(output?.textContent).toContain('%');
  });
});
