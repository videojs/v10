import { applyElementProps } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';

import type { MediaElement } from '../media-element';
import { menuGroupContext } from './context';

interface MenuGroupHost extends MediaElement {
  requestUpdate(): void;
}

export class MenuGroupController {
  readonly #host: MenuGroupHost;
  readonly #provider: ContextProvider<typeof menuGroupContext, MenuGroupHost>;
  readonly #contextValue = {
    registerLabel: (id: string) => this.#registerLabel(id),
  };

  #labelId: string | undefined;
  #appliedLabelId: string | undefined;

  constructor(host: MenuGroupHost) {
    this.#host = host;
    this.#provider = new ContextProvider(host, {
      context: menuGroupContext,
      initialValue: this.#contextValue,
    });
  }

  applyProps(): void {
    const currentLabelledBy = this.#host.getAttribute('aria-labelledby') ?? undefined;
    const hasExplicitLabelledBy = currentLabelledBy !== undefined && currentLabelledBy !== this.#appliedLabelId;
    const hasExplicitLabel = this.#host.hasAttribute('aria-label') || hasExplicitLabelledBy;

    if (hasExplicitLabel) {
      if (this.#appliedLabelId && currentLabelledBy === this.#appliedLabelId) {
        this.#host.removeAttribute('aria-labelledby');
      }

      this.#appliedLabelId = undefined;
      applyElementProps(this.#host, { role: 'group' });
      return;
    }

    this.#appliedLabelId = this.#labelId;
    applyElementProps(this.#host, {
      role: 'group',
      'aria-labelledby': this.#labelId,
    });
  }

  #registerLabel(id: string): () => void {
    this.#labelId = id;
    this.#provider.setValue(this.#contextValue);
    this.#host.requestUpdate();

    return () => {
      if (this.#labelId !== id) return;
      this.#labelId = undefined;
      this.#host.requestUpdate();
    };
  }
}
