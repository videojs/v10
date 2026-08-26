import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { MediaI18nProviderElement } from '../../../i18n';
import { DialogCloseElement } from '../../dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../dialog/dialog-description-element';
import { DialogPopupElement } from '../../dialog/dialog-popup-element';
import { DialogTitleElement } from '../../dialog/dialog-title-element';
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
  resetI18nRegistry();
  document.documentElement.removeAttribute('lang');
  document.body.innerHTML = '';
});

describe('ErrorDialogElement', () => {
  it('has the correct tag name', () => {
    expect(ErrorDialogElement.tagName).toBe('media-error-dialog');
  });

  it('provides dialogContext for child parts', async () => {
    ensureDefined(DialogTitleElement.tagName, DialogTitleElement);
    ensureDefined(DialogDescriptionElement.tagName, DialogDescriptionElement);
    ensureDefined(DialogCloseElement.tagName, DialogCloseElement);

    const el = createElement(ErrorDialogElement);
    const popup = createElement(DialogPopupElement);
    const title = document.createElement(DialogTitleElement.tagName) as DialogTitleElement;
    const desc = document.createElement(DialogDescriptionElement.tagName) as DialogDescriptionElement;
    const close = document.createElement(DialogCloseElement.tagName) as DialogCloseElement;

    popup.append(title, desc, close);
    el.append(popup);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(title.isConnected).toBe(true);
    expect(desc.isConnected).toBe(true);
    expect(close.isConnected).toBe(true);
    expect(popup.getAttribute('aria-labelledby')).toBe(title.id);
    expect(popup.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('handles missing child elements gracefully', async () => {
    const el = createElement(ErrorDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.isConnected).toBe(true);
  });

  it('shows translated dialog copy when es locale is registered', async () => {
    registerI18n('es', {
      'errors.title': 'Algo salió mal.',
      'common.ok': 'Aceptar',
      'errors.unexpected': 'Ocurrió un error inesperado.',
    });
    ensureDefined(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
    ensureDefined(DialogTitleElement.tagName, DialogTitleElement);
    ensureDefined(DialogDescriptionElement.tagName, DialogDescriptionElement);
    ensureDefined(DialogCloseElement.tagName, DialogCloseElement);

    const provider = new MediaI18nProviderElement();

    provider.setAttribute('lang', 'es');
    const el = createElement(ErrorDialogElement);
    const popup = createElement(DialogPopupElement);
    const title = document.createElement(DialogTitleElement.tagName) as DialogTitleElement;
    const desc = document.createElement(DialogDescriptionElement.tagName) as DialogDescriptionElement;
    const close = document.createElement(DialogCloseElement.tagName) as DialogCloseElement;

    popup.append(title, desc, close);
    el.append(popup);
    provider.appendChild(el);
    document.body.append(provider);
    await Promise.resolve();
    await el.updateComplete;

    expect(title.textContent).toBe('Algo salió mal.');
    expect(desc.textContent).toBe('Ocurrió un error inesperado.');
    expect(close.textContent).toBe('Aceptar');
  });

  it('preserves authored title copy', async () => {
    registerI18n('es', {
      'errors.title': 'Algo salió mal.',
      'common.ok': 'Aceptar',
      'errors.unexpected': 'Ocurrió un error inesperado.',
    });
    ensureDefined(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
    ensureDefined(DialogTitleElement.tagName, DialogTitleElement);
    ensureDefined(DialogDescriptionElement.tagName, DialogDescriptionElement);
    ensureDefined(DialogCloseElement.tagName, DialogCloseElement);

    const provider = new MediaI18nProviderElement();

    provider.setAttribute('lang', 'es');
    const el = createElement(ErrorDialogElement);
    const popup = createElement(DialogPopupElement);
    const title = document.createElement(DialogTitleElement.tagName) as DialogTitleElement;
    const desc = document.createElement(DialogDescriptionElement.tagName) as DialogDescriptionElement;
    const close = document.createElement(DialogCloseElement.tagName) as DialogCloseElement;

    title.textContent = 'Custom title';

    popup.append(title, desc, close);
    el.append(popup);
    provider.appendChild(el);
    document.body.append(provider);
    await Promise.resolve();
    await el.updateComplete;

    expect(title.textContent).toBe('Custom title');
    expect(desc.textContent).toBe('Ocurrió un error inesperado.');
    expect(close.textContent).toBe('Aceptar');
  });

  it('cleans up on disconnect', async () => {
    const el = createElement(ErrorDialogElement);

    document.body.appendChild(el);
    await el.updateComplete;

    document.body.removeChild(el);

    expect(el.isConnected).toBe(false);
  });
});
