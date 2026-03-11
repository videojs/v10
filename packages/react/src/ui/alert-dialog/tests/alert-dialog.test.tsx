import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertDialogClose } from '../alert-dialog-close';
import { AlertDialogDescription } from '../alert-dialog-description';
import { AlertDialogPopup } from '../alert-dialog-popup';
import { AlertDialogRoot } from '../alert-dialog-root';
import { AlertDialogTitle } from '../alert-dialog-title';

afterEach(cleanup);

describe('AlertDialogRoot', () => {
  it('provides context to children', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup data-testid="popup">content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('supports uncontrolled mode with defaultOpen', () => {
    const { container } = render(
      <AlertDialogRoot defaultOpen>
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('renders null when closed', () => {
    const { container } = render(
      <AlertDialogRoot open={false}>
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });
});

describe('AlertDialogPopup', () => {
  it('throws when used outside Root', () => {
    expect(() => render(<AlertDialogPopup />)).toThrow(
      'AlertDialog compound components must be used within an AlertDialog.Root'
    );
  });

  it('renders with alertdialog role and aria-modal', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    const popup = container.querySelector('[role="alertdialog"]')!;
    expect(popup.getAttribute('aria-modal')).toBe('true');
    expect(popup.getAttribute('tabindex')).toBe('-1');
  });

  it('sets data-open when open', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    const popup = container.querySelector('[role="alertdialog"]')!;
    expect(popup.hasAttribute('data-open')).toBe(true);
  });

  it('wires aria-labelledby to Title id', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogTitle>Title</AlertDialogTitle>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    const popup = container.querySelector('[role="alertdialog"]')!;
    const title = popup.querySelector('h2')!;
    expect(popup.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('wires aria-describedby to Description id', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogDescription>Desc</AlertDialogDescription>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    const popup = container.querySelector('[role="alertdialog"]')!;
    const desc = popup.querySelector('p')!;
    expect(popup.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <AlertDialogRoot open>
        <AlertDialogPopup ref={ref}>content</AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('AlertDialogTitle', () => {
  it('renders an h2 with the context-provided id', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogTitle>My Title</AlertDialogTitle>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    const title = container.querySelector('h2')!;
    expect(title.textContent).toBe('My Title');
    expect(title.id).toMatch(/^alert-dialog-title-/);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();

    render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogTitle ref={ref}>Title</AlertDialogTitle>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('AlertDialogDescription', () => {
  it('renders a p with the context-provided id', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogDescription>My Description</AlertDialogDescription>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    const desc = container.querySelector('p')!;
    expect(desc.textContent).toBe('My Description');
    expect(desc.id).toMatch(/^alert-dialog-desc-/);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLParagraphElement>();

    render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogDescription ref={ref}>Desc</AlertDialogDescription>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('AlertDialogClose', () => {
  it('renders a button', () => {
    const { container } = render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogClose>OK</AlertDialogClose>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    const button = container.querySelector('button')!;
    expect(button.textContent).toBe('OK');
    expect(button.type).toBe('button');
  });

  it('calls onOpenChange(false) on click', () => {
    const onOpenChange = vi.fn();

    const { container } = render(
      <AlertDialogRoot open onOpenChange={onOpenChange}>
        <AlertDialogPopup>
          <AlertDialogClose>OK</AlertDialogClose>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    container.querySelector('button')!.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <AlertDialogRoot open>
        <AlertDialogPopup>
          <AlertDialogClose ref={ref}>OK</AlertDialogClose>
        </AlertDialogPopup>
      </AlertDialogRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
