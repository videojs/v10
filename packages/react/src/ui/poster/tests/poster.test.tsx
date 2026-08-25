import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

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
    // Part of the metadata state this mock stands in for, and nothing here reads it.
    title: '',
    poster,
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

  it('leaves the source alone when only a srcSet is authored', () => {
    const { getByTestId } = render(<Poster data-testid="poster" srcSet="poster@2x.jpg 2x" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    // `src` would join the candidate set as the 1x entry.
    expect(getByTestId('poster').hasAttribute('src')).toBe(false);
  });

  it('reports loading again when the srcSet changes', () => {
    const { getByTestId, rerender } = render(<Poster data-testid="poster" srcSet="poster-480.jpg 480w" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    fireEvent.load(getByTestId('poster'));
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);

    rerender(<Poster data-testid="poster" srcSet="other-480.jpg 480w" />);

    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);
  });

  it('hides once playback starts', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ started: true, poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').hasAttribute('data-visible')).toBe(false);
  });

  it('reports the image lifecycle, matching the attributes the HTML element reports', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);

    fireEvent.load(getByTestId('poster'));

    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(false);
  });

  it('reports the lifecycle of a render override that rewrote the src', () => {
    // What an optimizing image component does: the resolved URL goes in, a
    // rewritten one lands on the element.
    const { getByTestId } = render(
      <Poster render={(props) => <img {...props} src="/optimized.jpg" data-testid="poster" alt="" />} />,
      { wrapper: wrapper({ poster: 'poster.jpg' }) }
    );

    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(true);

    fireEvent.load(getByTestId('poster'));

    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(false);
  });

  it("reports an override whose own source had already loaded, which `complete` can't tell it", () => {
    // Decoded before mount, so no `load` is coming.
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1280);

    const { getByTestId } = render(
      <Poster render={(props) => <img {...props} src={undefined} data-testid="poster" alt="" />} />,
      { wrapper: wrapper({ poster: 'poster.jpg' }) }
    );

    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(false);

    naturalWidth.mockRestore();
  });

  it('waits on an override that sources the image some other way', () => {
    // What a `<picture>` override leaves behind: an `<img>` with no source of its
    // own, which is `complete` on its own terms while a candidate is fetching.
    const { getByTestId } = render(
      <Poster render={(props) => <img {...props} src={undefined} data-testid="poster" alt="" />} />,
      { wrapper: wrapper({ poster: 'poster.jpg' }) }
    );

    const element = getByTestId('poster') as HTMLImageElement;

    expect(element.complete).toBe(true);
    expect(element.hasAttribute('data-loading')).toBe(true);
    expect(element.hasAttribute('data-error')).toBe(false);
  });

  it('waits again when a previous source is requested again', () => {
    const { getByTestId, rerender } = render(<Poster data-testid="poster" src="a.jpg" />, {
      wrapper: wrapper({ poster: 'poster.jpg' }),
    });

    fireEvent.load(getByTestId('poster'));
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(true);

    // A browser holds the previous request's pixels while the next one fetches.
    Object.defineProperty(getByTestId('poster'), 'naturalWidth', { value: 1280, configurable: true });

    rerender(<Poster data-testid="poster" src="b.jpg" />);

    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);

    rerender(<Poster data-testid="poster" src="a.jpg" />);

    expect(getByTestId('poster').hasAttribute('data-loading')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);
  });

  it('reports an image that failed', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, {
      wrapper: wrapper({ poster: 'missing.jpg' }),
    });

    fireEvent.error(getByTestId('poster'));

    expect(getByTestId('poster').hasAttribute('data-error')).toBe(true);
    expect(getByTestId('poster').hasAttribute('data-loaded')).toBe(false);
  });

  it('reports nothing to load when no source resolved', () => {
    const { getByTestId } = render(<Poster data-testid="poster" />, { wrapper: wrapper() });

    const element = getByTestId('poster');

    expect(element.hasAttribute('data-loading')).toBe(false);
    expect(element.hasAttribute('data-loaded')).toBe(false);
    expect(element.hasAttribute('data-error')).toBe(false);
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
