import { type AnyPlayerStore, errorFeature, type PlayerTarget } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import type { ErrorLike } from '@videojs/media';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { MediaI18nProviderElement } from '../../../i18n';
import { containerContext, playerContext } from '../../../player/context';
import { DialogCloseElement } from '../../dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../dialog/dialog-description-element';
import { DialogPopupElement } from '../../dialog/dialog-popup-element';
import { DialogTitleElement } from '../../dialog/dialog-title-element';
import { UIElement } from '../../ui-element';
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

class TestContainerProviderElement extends UIElement {
  readonly provider = new ContextProvider(this, {
    context: containerContext,
    initialValue: {
      container: this,
      registerContainer: () => () => {},
    },
  });
}

class TestErrorProviderElement extends UIElement {
  readonly #media = document.createElement('video');
  readonly #errorStore = createStore<PlayerTarget>()(errorFeature);
  // SAFETY: The error feature is the only slice the error dialog reads from the player store.
  readonly store = this.#errorStore as unknown as AnyPlayerStore;
  readonly provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  #error: ErrorLike | null = null;

  constructor() {
    super();
    Object.defineProperty(this.#media, 'error', { configurable: true, get: () => this.#error });
    this.#errorStore.attach({ media: this.#media, container: null });
  }

  get error(): ErrorLike | null {
    return this.#errorStore.state.error;
  }

  setError(error: ErrorLike): void {
    this.#error = error;
    this.#media.dispatchEvent(new Event('error'));
    flush();
  }
}

function createErrorDialogWithClose(): {
  provider: TestErrorProviderElement;
  dialog: ErrorDialogElement;
  close: DialogCloseElement;
} {
  ensureDefined(DialogCloseElement.tagName, DialogCloseElement);

  const provider = createElement(TestErrorProviderElement);
  const dialog = createElement(ErrorDialogElement);
  const popup = createElement(DialogPopupElement);
  const close = document.createElement(DialogCloseElement.tagName) as DialogCloseElement;

  popup.append(close);
  dialog.append(popup);
  provider.append(dialog);
  document.body.append(provider);

  return { provider, dialog, close };
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

  it('scopes dialog semantics to the provided container', async () => {
    const container = createElement(TestContainerProviderElement);
    const el = createElement(ErrorDialogElement);
    const popup = createElement(DialogPopupElement);

    el.append(popup);
    container.append(el);
    document.body.append(container);
    await el.updateComplete;
    await popup.updateComplete;
    await el.updateComplete;

    expect(popup.getAttribute('role')).toBe('alertdialog');
    expect(popup.hasAttribute('aria-modal')).toBe(false);
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
  it('restores the current error and dismissal behavior after rapid remove and reappend cycles', async () => {
    const { provider, dialog, close } = createErrorDialogWithClose();
    const error = { code: 4, message: 'Unsupported source' };

    provider.setError(error);
    await dialog.updateComplete;
    await close.updateComplete;

    expect(dialog.hasAttribute('data-open')).toBe(true);

    for (let cycle = 0; cycle < 3; cycle++) {
      dialog.remove();
      provider.append(dialog);
    }

    await dialog.updateComplete;
    await close.updateComplete;

    expect(dialog.hasAttribute('data-open')).toBe(true);
    expect(provider.error).toEqual(error);

    close.click();

    expect(provider.error).toBeNull();
  });

  it('releases dismissal behavior when destroyed while connected', async () => {
    const { provider, dialog, close } = createErrorDialogWithClose();
    const error = { code: 4, message: 'Unsupported source' };

    provider.setError(error);
    await dialog.updateComplete;
    await close.updateComplete;

    dialog.destroy();
    close.click();

    expect(provider.error).toEqual(error);
  });
});
