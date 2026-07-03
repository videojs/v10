import {
  createTranslator,
  DEFAULT_LOCALE,
  getI18nTranslations,
  type Locale,
  onI18nRegistryChange,
  type Translator,
} from '@videojs/core/i18n';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import type { I18nContext } from './context';

export function getFallbackTranslator(): Translator {
  return createTranslator(getI18nTranslations(DEFAULT_LOCALE), DEFAULT_LOCALE);
}

export class I18nController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #consumer: ContextConsumer<I18nContext, ReactiveControllerHost & HTMLElement>;
  #unsubscribeRegistry: (() => void) | undefined;

  constructor(host: ReactiveControllerHost & HTMLElement, context: I18nContext) {
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
    this.#unsubscribeRegistry = onI18nRegistryChange(() => {
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
  export type Constructor = new (host: ReactiveControllerHost & HTMLElement, context: I18nContext) => I18nController;
}
