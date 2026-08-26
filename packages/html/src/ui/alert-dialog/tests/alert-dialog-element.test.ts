import { flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { DialogCloseElement } from '../../dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../dialog/dialog-description-element';
import { DialogPopupElement } from '../../dialog/dialog-popup-element';
import { DialogTitleElement } from '../../dialog/dialog-title-element';
import { AlertDialogElement } from '../alert-dialog-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');

  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function ensureDefined(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) customElements.define(tagName, Base);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AlertDialogElement', () => {
  it('has the correct tag name', () => {
    expect(AlertDialogElement.tagName).toBe('media-alert-dialog');
  });

  it('initializes with open set to false', () => {
    const el = createElement(AlertDialogElement);

    expect(el.open).toBe(false);
  });

  it('sets data-open attribute when open is true', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute('data-open')).toBe(true);
  });

  it('does not set data-open attribute when open is false', async () => {
    const el = createElement(AlertDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute('data-open')).toBe(false);
  });

  it('removes data-open attribute after close transition completes', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.hasAttribute('data-open')).toBe(true);

    el.open = false;
    await el.updateComplete;

    // data-open stays true during the ending transition (active: true, status: 'ending').
    // Wait for the close transition to fully complete (double RAF + animation wait).
    await vi.waitFor(() => {
      expect(el.hasAttribute('data-open')).toBe(false);
    });
  });

  it('keeps dialog semantics on the popup rather than the context host', async () => {
    const el = createElement(AlertDialogElement);
    const popup = createElement(DialogPopupElement);

    el.open = true;
    el.append(popup);

    document.body.appendChild(el);
    await el.updateComplete;

    await vi.waitFor(() => {
      expect(el.hasAttribute('role')).toBe(false);
      expect(popup.getAttribute('role')).toBe('alertdialog');
      expect(popup.getAttribute('aria-modal')).toBe('true');
      expect(popup.getAttribute('tabindex')).toBe('-1');
    });
  });

  it('uses generic dialog parts for its accessible name, description, and close action', async () => {
    ensureDefined(DialogTitleElement.tagName, DialogTitleElement);
    ensureDefined(DialogDescriptionElement.tagName, DialogDescriptionElement);
    ensureDefined(DialogCloseElement.tagName, DialogCloseElement);

    const el = createElement(AlertDialogElement);
    const popup = createElement(DialogPopupElement);
    const title = document.createElement(DialogTitleElement.tagName) as DialogTitleElement;
    const description = document.createElement(DialogDescriptionElement.tagName) as DialogDescriptionElement;
    const close = document.createElement(DialogCloseElement.tagName) as DialogCloseElement;

    popup.append(title, description, close);
    el.append(popup);
    el.open = true;

    document.body.append(el);
    await el.updateComplete;
    await title.updateComplete;
    await description.updateComplete;

    expect(popup.getAttribute('aria-labelledby')).toBe(title.id);
    expect(popup.getAttribute('aria-describedby')).toBe(description.id);

    close.click();
    expect(el.open).toBe(false);
  });

  it('dispatches open-change event on close', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    const spy = vi.fn();

    el.addEventListener('open-change', spy);

    // Escape triggers dismiss layer → onOpenChange(false) → open-change event.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(el.open).toBe(false);
    expect(spy).toHaveBeenCalledOnce();
    expect((spy.mock.calls[0]![0] as CustomEvent).detail).toEqual({ open: false });
  });

  it('closes on Escape key press', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(el.open).toBe(false);
  });

  it('does not close on Escape when already closed', async () => {
    const el = createElement(AlertDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    const spy = vi.fn();

    el.addEventListener('open-change', spy);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(el.open).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores non-Escape key presses', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(el.open).toBe(true);
  });

  it('does not close on an arbitrary button click within the dialog', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    const popup = createElement(DialogPopupElement);
    const button = document.createElement('button');

    popup.append(button);
    el.append(popup);

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    button.click();

    expect(el.open).toBe(true);
  });

  it('does not close on non-button element click', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    const popup = createElement(DialogPopupElement);
    const span = document.createElement('span');

    popup.append(span);
    el.append(popup);

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    span.click();

    expect(el.open).toBe(true);
  });

  it('cleans up on disconnect', async () => {
    const el = createElement(AlertDialogElement);

    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    document.body.removeChild(el);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // Dialog was destroyed on disconnect, so open should still be true.
    expect(el.open).toBe(true);
  });
});
