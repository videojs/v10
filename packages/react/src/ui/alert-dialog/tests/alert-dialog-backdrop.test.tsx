import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { AlertDialogBackdrop } from '../alert-dialog-backdrop';
import { AlertDialogPopup } from '../alert-dialog-popup';
import { AlertDialogRoot } from '../alert-dialog-root';

afterEach(cleanup);

describe('AlertDialogBackdrop', () => {
  it('renders only while the dialog is present', () => {
    const { queryByTestId, rerender } = render(
      <AlertDialogRoot open={false}>
        <AlertDialogBackdrop data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(queryByTestId('backdrop')).toBeNull();

    rerender(
      <AlertDialogRoot open>
        <AlertDialogBackdrop data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(queryByTestId('backdrop')).not.toBeNull();
  });

  it('is presentational and receives dialog state attributes', () => {
    const { getByTestId } = render(
      <AlertDialogRoot open>
        <AlertDialogBackdrop data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    const backdrop = getByTestId('backdrop');

    expect(backdrop.getAttribute('role')).toBe('presentation');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop.hasAttribute('data-open')).toBe(true);
  });

  it('allows the default aria-hidden value to be overridden', () => {
    const { getByTestId } = render(
      <AlertDialogRoot open>
        <AlertDialogBackdrop aria-hidden={false} data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(getByTestId('backdrop').getAttribute('aria-hidden')).toBe('false');
  });

  it('stays rendered with ending state while the dialog closes', () => {
    const { getByTestId, rerender } = render(
      <AlertDialogRoot open>
        <AlertDialogBackdrop data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    rerender(
      <AlertDialogRoot open={false}>
        <AlertDialogBackdrop data-testid="backdrop" />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(getByTestId('backdrop').hasAttribute('data-ending-style')).toBe(true);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <AlertDialogRoot open>
        <AlertDialogBackdrop ref={ref} />
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
