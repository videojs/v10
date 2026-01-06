import type { Context } from '@lit/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../../core/slice';
import type { Store } from '../../core/store';
import type { StoreConnector } from './attach-mixin';
import type { StoreProvider } from './provider-mixin';

import { createStoreAttachMixin } from './attach-mixin';
import { createStoreProviderMixin } from './provider-mixin';

/**
 * Creates a combined mixin that both provides a store and auto-attaches media elements.
 *
 * Composes `StoreProviderMixin` and `StoreAttachMixin` - the provider mixin provides the store
 * via context, and the attach mixin consumes it and auto-attaches media elements.
 *
 * @example
 * ```ts
 * const { StoreMixin } = createStore({ slices: [playbackSlice] });
 *
 * class MyPlayer extends StoreMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     this.attachShadow({ mode: 'open' });
 *     this.shadowRoot.innerHTML = '<slot></slot>';
 *   }
 * }
 * ```
 */
export function createStoreMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  factory: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin<CustomElement, StoreProvider<Slices> & StoreConnector<Slices>> {
  const ProviderMixin = createStoreProviderMixin<Slices>(context, factory);
  const AttachMixin = createStoreAttachMixin<Slices>(context);

  return <Base extends Constructor<CustomElement>>(BaseClass: Base) => {
    // ProviderMixin wraps AttachMixin so during connectedCallback:
    // 1. ProviderMixin runs first (provides store via context)
    // 2. AttachMixin runs second (consumes store from context)
    return ProviderMixin(AttachMixin(BaseClass));
  };
}
