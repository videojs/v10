import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Overlay } from '../overlay';

afterEach(cleanup);

describe('Overlay', () => {
  it('reflects controls visibility through data attrs', () => {
    const { Wrapper } = createPlayerWrapper({
      userActive: true,
      controlsVisible: true,
      toggleControls: () => true,
      error: null,
      dismissError: () => {},
    });

    const { getByTestId } = render(<Overlay data-testid="overlay" />, { wrapper: Wrapper });
    const overlay = getByTestId('overlay');

    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.hasAttribute('data-visible')).toBe(true);
    expect(overlay.hasAttribute('data-controls-visible')).toBe(true);
    expect(overlay.hasAttribute('data-error-visible')).toBe(false);
  });

  it('reflects error visibility through data attrs', () => {
    const { Wrapper } = createPlayerWrapper({
      userActive: false,
      controlsVisible: false,
      toggleControls: () => false,
      error: { code: 1, message: 'failed' },
      dismissError: () => {},
    });

    const { getByTestId } = render(<Overlay data-testid="overlay" />, { wrapper: Wrapper });
    const overlay = getByTestId('overlay');

    expect(overlay.hasAttribute('data-visible')).toBe(true);
    expect(overlay.hasAttribute('data-controls-visible')).toBe(false);
    expect(overlay.hasAttribute('data-error-visible')).toBe(true);
  });

  it('does not set visibility attrs when hidden', () => {
    const { Wrapper } = createPlayerWrapper({
      userActive: false,
      controlsVisible: false,
      toggleControls: () => false,
      error: null,
      dismissError: () => {},
    });

    const { getByTestId } = render(<Overlay data-testid="overlay" />, { wrapper: Wrapper });
    const overlay = getByTestId('overlay');

    expect(overlay.hasAttribute('data-visible')).toBe(false);
    expect(overlay.hasAttribute('data-controls-visible')).toBe(false);
    expect(overlay.hasAttribute('data-error-visible')).toBe(false);
  });
});
