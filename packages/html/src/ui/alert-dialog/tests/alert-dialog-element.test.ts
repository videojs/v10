import { flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('applies alertdialog role and aria-modal', async () => {
    const el = createElement(AlertDialogElement);
    el.open = true;

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
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

  it('closes on button click within the dialog', async () => {
    const el = createElement(AlertDialogElement);
    el.open = true;

    const button = document.createElement('button');
    el.appendChild(button);

    document.body.appendChild(el);
    await el.updateComplete;
    flush();

    button.click();

    expect(el.open).toBe(false);
  });

  it('does not close on non-button element click', async () => {
    const el = createElement(AlertDialogElement);
    el.open = true;

    const span = document.createElement('span');
    el.appendChild(span);

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
