import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { DialogBackdrop } from '../dialog-backdrop';
import { DialogPopup } from '../dialog-popup';
import { DialogRoot } from '../dialog-root';

afterEach(cleanup);

describe('DialogBackdrop', () => {
  it('renders only while the dialog is present', () => {
    const { queryByTestId, rerender } = render(
      <DialogRoot open={false}>
        <DialogBackdrop data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    expect(queryByTestId('backdrop')).toBeNull();

    rerender(
      <DialogRoot open>
        <DialogBackdrop data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    expect(queryByTestId('backdrop')).not.toBeNull();
  });

  it('is presentational and receives dialog state attributes', () => {
    const { getByTestId } = render(
      <DialogRoot open>
        <DialogBackdrop data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    const backdrop = getByTestId('backdrop');

    expect(backdrop.getAttribute('role')).toBe('presentation');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop.hasAttribute('data-open')).toBe(true);
  });

  it('allows the default aria-hidden value to be overridden', () => {
    const { getByTestId } = render(
      <DialogRoot open>
        <DialogBackdrop aria-hidden={false} data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    expect(getByTestId('backdrop').getAttribute('aria-hidden')).toBe('false');
  });

  it('stays rendered with ending state while the dialog closes', () => {
    const { getByTestId, rerender } = render(
      <DialogRoot open>
        <DialogBackdrop data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    rerender(
      <DialogRoot open={false}>
        <DialogBackdrop data-testid="backdrop" />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    expect(getByTestId('backdrop').hasAttribute('data-ending-style')).toBe(true);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <DialogRoot open>
        <DialogBackdrop ref={ref} />
        <DialogPopup>content</DialogPopup>
      </DialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
