import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GifVideo } from '../gif-video';

beforeEach(() => {
  // Keep the fetch a `src` kicks off pending; these tests cover the component
  // wiring, not the decode pipeline.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<never>(() => {}))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GifVideo', () => {
  it('renders a canvas and starts fetching the source', () => {
    const { container } = render(<GifVideo src="https://example.com/animated.gif" />);

    expect(container.querySelector('canvas')).not.toBe(null);
    expect(fetch).toHaveBeenCalledWith('https://example.com/animated.gif', expect.anything());
  });

  it('renders without a source and fetches when one arrives', () => {
    const { rerender } = render(<GifVideo />);
    expect(fetch).not.toHaveBeenCalled();

    rerender(<GifVideo src="https://example.com/animated.gif" />);
    expect(fetch).toHaveBeenCalledWith('https://example.com/animated.gif', expect.anything());
  });

  it('renders children as canvas fallback content', () => {
    const { container } = render(
      <GifVideo>
        <span>Your browser does not support canvas.</span>
      </GifVideo>
    );
    expect(container.querySelector('canvas span')).not.toBe(null);
  });
});
