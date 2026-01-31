import { describe, expectTypeOf, it } from 'vitest';

import { createLitTestStore, TestBaseElement } from '../../tests/test-utils';

describe('mixin types', () => {
  it('storeMixin adds store property', () => {
    const { StoreMixin } = createLitTestStore();
    const _MixedElement = StoreMixin(TestBaseElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });

  it('providerMixin adds store property', () => {
    const { ProviderMixin } = createLitTestStore();
    const _MixedElement = ProviderMixin(TestBaseElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });

  it('containerMixin adds store property', () => {
    const { ContainerMixin } = createLitTestStore();
    const _MixedElement = ContainerMixin(TestBaseElement);
    type Instance = InstanceType<typeof _MixedElement>;

    // Verify store property exists on the mixed type
    expectTypeOf<Instance>().toHaveProperty('store');
  });
});
