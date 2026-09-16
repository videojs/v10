import { cleanup, render } from '@testing-library/react';
import { createRef, type ExoticComponent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createPlayerWrapper } from '../../testing/mocks';
import { PlayButton } from '../../ui/play-button';
import { Slider } from '../../ui/slider';
import { MuteButton } from '../skins/default-video/components/buttons/mute-button';
import { Button } from '../skins/shared/components/buttons/button';
import { SliderThumb } from '../skins/shared/components/sliders/slider';

const playback = {
  paused: true,
  ended: false,
  started: false,
  waiting: false,
  play: vi.fn(),
  pause: vi.fn(),
  togglePaused: vi.fn(),
};

const volume = {
  volume: 1,
  muted: false,
  volumeAvailability: 'available',
  mutedAvailability: 'available',
  setVolume: () => 1,
  toggleMuted: () => false,
};

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

/**
 * React 18 and Preact only hand a ref to a function component through `forwardRef`; the test renderer is React 19,
 * which also passes `ref` as a prop, so the wrapper itself is what proves the ref survives on every renderer.
 */
function forwardsRef(component: ExoticComponent<object>): boolean {
  return component.$$typeof === Symbol.for('react.forward_ref');
}

describe('Button', () => {
  it('is a ref-forwarding render target', () => {
    expect(forwardsRef(Button)).toBe(true);
  });

  it('delivers a media button’s composed refs to the rendered <button>', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ref = createRef<HTMLButtonElement>();
    const { Wrapper } = createPlayerWrapper(playback);

    render(<PlayButton ref={ref} render={<Button />} />, { wrapper: Wrapper });

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.classList.contains('media-button')).toBe(true);
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('should render a <button>'));
  });
});

describe('SliderThumb', () => {
  it('delivers the slider’s thumb ref to the rendered element', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Slider.Root min={0} max={1} value={0.5} onValueChange={() => {}}>
        <Slider.Thumb ref={ref} render={<SliderThumb />} />
      </Slider.Root>
    );

    expect(forwardsRef(SliderThumb)).toBe(true);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('MuteButton', () => {
  it('forwards a popup trigger’s ref through to its <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    const { Wrapper } = createPlayerWrapper(volume);

    render(<MuteButton ref={ref} />, { wrapper: Wrapper });

    expect(forwardsRef(MuteButton)).toBe(true);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
