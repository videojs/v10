import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Placeholder } from '../placeholder';

afterEach(cleanup);

function wrapper(state: { started?: boolean; placeholder?: string } = {}) {
  const { started = false, placeholder = '' } = state;
  return createPlayerWrapper({
    paused: !started,
    ended: false,
    started,
    waiting: false,
    play: async () => {},
    pause: () => {},
    togglePaused: () => true,
    contentTitle: '',
    poster: '',
    placeholder,
    setContentTitle: () => {},
    setDefaultContentTitle: () => {},
    setPoster: () => {},
    setDefaultPoster: () => {},
    setPlaceholder: () => {},
    setDefaultPlaceholder: () => {},
  }).Wrapper;
}

describe('Placeholder', () => {
  it('paints the resolved placeholder as its background image', () => {
    const { getByTestId } = render(<Placeholder data-testid="placeholder" />, {
      wrapper: wrapper({ placeholder: 'tiny.jpg' }),
    });

    expect(getByTestId('placeholder').style.backgroundImage).toBe('url("tiny.jpg")');
  });

  it('paints nothing when nothing supplied a placeholder', () => {
    const { getByTestId } = render(<Placeholder data-testid="placeholder" />, { wrapper: wrapper() });

    expect(getByTestId('placeholder').style.backgroundImage).toBe('');
    expect(getByTestId('placeholder').hasAttribute('data-visible')).toBe(true);
  });

  it('hides once playback starts', () => {
    const { getByTestId } = render(<Placeholder data-testid="placeholder" />, {
      wrapper: wrapper({ started: true, placeholder: 'tiny.jpg' }),
    });

    expect(getByTestId('placeholder').hasAttribute('data-visible')).toBe(false);
    // The image stays put so the fade-out has something to fade.
    expect(getByTestId('placeholder').style.backgroundImage).toBe('url("tiny.jpg")');
  });

  it('renders one empty element', () => {
    const { getByTestId } = render(<Placeholder data-testid="placeholder" />, {
      wrapper: wrapper({ placeholder: 'tiny.jpg' }),
    });

    const element = getByTestId('placeholder');
    expect(element.tagName).toBe('DIV');
    expect(element.childNodes).toHaveLength(0);
  });

  it('lets an author style override the background image', () => {
    const { getByTestId } = render(
      <Placeholder data-testid="placeholder" style={{ backgroundImage: 'url("mine.jpg")' }} />,
      { wrapper: wrapper({ placeholder: 'tiny.jpg' }) }
    );

    expect(getByTestId('placeholder').style.backgroundImage).toBe('url("mine.jpg")');
  });
});
