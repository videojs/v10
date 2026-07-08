import {
  createTranslator,
  getI18nTranslations,
  type Locale,
  onI18nRegistryChange,
  type Translator,
} from '@videojs/core/i18n';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import type { I18nContext } from './context';

const DEFAULT_LOCALE = 'en';

let fallbackTranslator: Translator | undefined;

export type I18nControllerHost = ReactiveControllerHost & HTMLElement;

export function getFallbackTranslator(): Translator {
  fallbackTranslator ??= createTranslator(getI18nTranslations(DEFAULT_LOCALE), DEFAULT_LOCALE);
  return fallbackTranslator;
}

export class I18nController implements ReactiveController {
  readonly #host: I18nControllerHost;
  readonly #consumer: ContextConsumer<I18nContext, I18nControllerHost>;
  #unsubscribeRegistry: (() => void) | undefined;

  constructor(host: I18nControllerHost, context: I18nContext) {
    this.#host = host;
    this.#consumer = new ContextConsumer(host, {
      context,
      callback: () => this.#host.requestUpdate(),
      subscribe: true,
    });
    host.addController(this);
  }

  get value(): Translator {
    return this.#consumer.value?.translator ?? getFallbackTranslator();
  }

  get locale(): Locale {
    return this.#consumer.value?.locale ?? DEFAULT_LOCALE;
  }

  hostConnected(): void {
    fallbackTranslator = undefined;
    this.#unsubscribeRegistry = onI18nRegistryChange(() => {
      fallbackTranslator = undefined;
      if (!this.#consumer.value) {
        this.#host.requestUpdate();
      }
    });
  }

  hostDisconnected(): void {
    this.#unsubscribeRegistry?.();
    this.#unsubscribeRegistry = undefined;
  }
}

export namespace I18nController {
  export type Constructor = typeof I18nController;
  export type Host = I18nControllerHost;
}
