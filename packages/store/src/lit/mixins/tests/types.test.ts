import { ReactiveElement } from '@lit/reactive-element';
import { describe, expectTypeOf, it } from 'vitest';

import { createLitTestStore } from '../../tests/test-utils';

describe('mixin types', () => {
  it('storeMixin adds store property', () => {
    const { StoreMixin } = createLitTestStore();
    const _MixedElement = StoreMixin(ReactiveElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });

  it('storeProviderMixin adds store property', () => {
    const { StoreProviderMixin } = createLitTestStore();
    const _MixedElement = StoreProviderMixin(ReactiveElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });

  it('storeAttachMixin adds store property', () => {
    const { StoreAttachMixin } = createLitTestStore();
    const _MixedElement = StoreAttachMixin(ReactiveElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });
});
