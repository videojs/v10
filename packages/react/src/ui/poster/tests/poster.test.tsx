import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Poster } from '../poster';

afterEach(cleanup);

function wrapper(state: { started?: boolean; poster?: string } = {}) {
  const { started = false, poster = '' } = state;
  return createPlayerWrapper({
    paused: !started,
    ended: false,
    started,
    waiting: false,
    play: async () => {},
    pause: () => {},
    togglePaused: () => true,
    contentTitle: '',
    poster,
    placeholder: '',
    setContentTitle: () => {},
    setDefaultContentTitle: () => {},
    setPoster: () => {},
    setDefaultPoster: () => {},
    setPlaceholder: () => {},
    setDefaultPlaceholder: () => {},
  }).Wrapper;
}

describe('Poster', () => {
  it('renders one image carrying the resolved poster', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    const element = getByTestId('poster');
    expect(element.tagName).toBe('IMG');
    expect(element.getAttribute('src')).toBe('poster.jpg');
  });

  it('leaves the src attribute off when nothing resolved one', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, { wrapper: wrapper() });

    // An empty `src` requests the document URL.
    expect(getByTestId('poster').hasAttribute('src')).toBe(false);
  });

  it('prefers a src passed to it over the resolved one', () => {
    const { getByTestId } = render(<Poster data-testid="poster" src="mine.jpg" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').getAttribute('src')).toBe('mine.jpg');
  });

  it('is decorative by default and takes an alt you supply', () => {
    const { getByTestId, rerender } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').getAttribute('alt')).toBe('');

    rerender(<Poster data-testid="poster" alt="Keynote speaker" />);

    expect(getByTestId('poster').getAttribute('alt')).toBe('Keynote speaker');
  });

  it('keeps the image attributes it does not own', () => {
    const { getByTestId } = render(
      <Poster data-testid="poster" srcSet="poster-480.jpg 480w" sizes="100vw" loading="lazy" />,
      { wrapper: wrapper({ poster: 'poster.jpg' }) }
    );

    const element = getByTestId('poster');
    expect(element.getAttribute('srcset')).toBe('poster-480.jpg 480w');
    expect(element.getAttribute('sizes')).toBe('100vw');
    expect(element.getAttribute('loading')).toBe('lazy');
  });

  it('hides once playback starts', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ started: true, poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').hasAttribute('data-visible')).toBe(false);
  });

  it('reports when the image has loaded', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);

    fireEvent.load(getByTestId('poster'));

    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);
  });

  it('hands the resolved src to a render override', () => {
    const { getByTestId } = render(
      <Poster render={(props) => <img {...props} data-testid="custom" alt="Keynote speaker" />} />,
      { wrapper: wrapper({ poster: 'poster.jpg' }) }
    );

    const element = getByTestId('custom');
    expect(element.getAttribute('src')).toBe('poster.jpg');
    expect(element.getAttribute('alt')).toBe('Keynote speaker');
  });
});
