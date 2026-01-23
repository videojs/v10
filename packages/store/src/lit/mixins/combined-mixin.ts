import type { Context } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnyFeature, UnionFeatureTarget } from '../../core/feature';

import type { Store, StoreProvider } from '../../core/store';

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
 * const { StoreMixin } = createStore({ features: [playbackFeature] });
 *
 * class MyPlayer extends StoreMixin(LitElement) {
 *   render() {
 *     return html`<slot></slot>`;
 *   }
 * }
 * ```
 */
export function createStoreMixin<Features extends AnyFeature[]>(
  context: Context<unknown, Store<UnionFeatureTarget<Features>, Features>>,
  factory: () => Store<UnionFeatureTarget<Features>, Features>
): Mixin<ReactiveElement, StoreProvider<Features>> {
  const ProviderMixin = createStoreProviderMixin<Features>(context, factory);
  const AttachMixin = createStoreAttachMixin<Features>(context);

  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    // ProviderMixin wraps AttachMixin so during connectedCallback:
    // 1. ProviderMixin runs first (provides store via context)
    // 2. AttachMixin runs second (consumes store from context)
    return ProviderMixin(AttachMixin(BaseClass));
  };
}
