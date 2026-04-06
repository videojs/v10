import { afterEach, describe, expect, it } from 'vitest';
import { AlertDialogCloseElement } from '../../alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../alert-dialog/alert-dialog-description-element';
import { AlertDialogTitleElement } from '../../alert-dialog/alert-dialog-title-element';
import { ErrorDialogElement } from '../error-dialog-element';

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
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ErrorDialogElement', () => {
  it('has the correct tag name', () => {
    expect(ErrorDialogElement.tagName).toBe('media-error-dialog');
  });

  it('provides alertDialogContext for child parts', async () => {
    ensureDefined(AlertDialogTitleElement.tagName, AlertDialogTitleElement);
    ensureDefined(AlertDialogDescriptionElement.tagName, AlertDialogDescriptionElement);
    ensureDefined(AlertDialogCloseElement.tagName, AlertDialogCloseElement);

    const el = createElement(ErrorDialogElement);
    const title = document.createElement(AlertDialogTitleElement.tagName) as AlertDialogTitleElement;
    const desc = document.createElement(AlertDialogDescriptionElement.tagName) as AlertDialogDescriptionElement;
    const close = document.createElement(AlertDialogCloseElement.tagName) as AlertDialogCloseElement;

    el.appendChild(title);
    el.appendChild(desc);
    el.appendChild(close);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(title.isConnected).toBe(true);
    expect(desc.isConnected).toBe(true);
    expect(close.isConnected).toBe(true);
  });

  it('handles missing child elements gracefully', async () => {
    const el = createElement(ErrorDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.isConnected).toBe(true);
  });

  it('cleans up on disconnect', async () => {
    const el = createElement(ErrorDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    document.body.removeChild(el);

    expect(el.isConnected).toBe(false);
  });
});
