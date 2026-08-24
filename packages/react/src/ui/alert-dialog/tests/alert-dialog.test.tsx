import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Dialog } from '../../dialog';
import { AlertDialogRoot } from '../alert-dialog-root';

afterEach(cleanup);

describe('AlertDialogRoot', () => {
  it('provides alert semantics to generic dialog parts', () => {
    const { getByRole } = render(
      <AlertDialogRoot open>
        <Dialog.Popup>
          <Dialog.Title>Stop playback?</Dialog.Title>
          <Dialog.Description>The current video will close.</Dialog.Description>
          <Dialog.Close>Continue</Dialog.Close>
        </Dialog.Popup>
      </AlertDialogRoot>
    );

    const popup = getByRole('alertdialog');
    expect(popup.getAttribute('aria-modal')).toBe('true');
    expect(popup.getAttribute('aria-labelledby')).toBe(getByRole('heading').id);
    expect(popup.getAttribute('aria-describedby')).toBe(getByRole('paragraph').id);
  });

  it('supports uncontrolled mode with defaultOpen', () => {
    const { getByRole } = render(
      <AlertDialogRoot defaultOpen>
        <Dialog.Popup>Content</Dialog.Popup>
      </AlertDialogRoot>
    );

    expect(getByRole('alertdialog')).toBeDefined();
  });

  it('does not render the popup while closed', () => {
    const { queryByRole } = render(
      <AlertDialogRoot open={false}>
        <Dialog.Popup>Content</Dialog.Popup>
      </AlertDialogRoot>
    );

    expect(queryByRole('alertdialog')).toBeNull();
  });
});
