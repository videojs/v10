import type {
  ComplexAttributeConverter as LitComplexAttributeConverter,
  PropertyDeclaration as LitPropertyDeclaration,
  PropertyValueMap as LitPropertyValueMap,
  PropertyValues as LitPropertyValues,
  ReactiveElement as LitReactiveElement,
  ReactiveController as LitReactiveController,
  ReactiveControllerHost as LitReactiveControllerHost,
} from '@lit/reactive-element';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';

import { ReactiveElement } from '../reactive-element';
import type {
  ComplexAttributeConverter,
  PropertyDeclaration,
  PropertyDeclarations,
  PropertyValueMap,
  PropertyValues,
  ReactiveController,
  ReactiveControllerHost,
} from '../types';

type SupportedLitPropertyDeclaration<Type = unknown, TypeHint = unknown> = Pick<
  LitPropertyDeclaration<Type, TypeHint>,
  'attribute' | 'type' | 'converter' | 'hasChanged' | 'noAccessor'
>;

type SupportedLitPropertyDeclarations = Readonly<Record<string, SupportedLitPropertyDeclaration>>;

type PublicReactiveElementMembers =
  | 'addController'
  | 'attributeChangedCallback'
  | 'connectedCallback'
  | 'disconnectedCallback'
  | 'hasUpdated'
  | 'isUpdatePending'
  | 'removeController'
  | 'updateComplete';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Lit compatibility', () => {
  it('uses the Lit reactive-controller contracts exactly', () => {
    expectTypeOf<ReactiveController>().toEqualTypeOf<LitReactiveController>();
    expectTypeOf<ReactiveControllerHost>().toEqualTypeOf<LitReactiveControllerHost>();
    expectTypeOf<ReactiveElement>().toMatchTypeOf<LitReactiveControllerHost>();
  });

  it('uses exact Lit signatures for its public ReactiveElement subset', () => {
    expectTypeOf<Pick<ReactiveElement, PublicReactiveElementMembers>>().toEqualTypeOf<
      Pick<LitReactiveElement, PublicReactiveElementMembers>
    >();
    expectTypeOf<Pick<typeof ReactiveElement, 'observedAttributes'>>().toEqualTypeOf<
      Pick<typeof LitReactiveElement, 'observedAttributes'>
    >();
  });

  it('uses exact Lit types for the supported property declaration subset', () => {
    expectTypeOf<ComplexAttributeConverter>().toEqualTypeOf<LitComplexAttributeConverter>();
    expectTypeOf<PropertyDeclaration>().toEqualTypeOf<SupportedLitPropertyDeclaration>();
    expectTypeOf<PropertyDeclarations>().toEqualTypeOf<SupportedLitPropertyDeclarations>();
  });

  it('uses Lit property-value map types exactly', () => {
    expectTypeOf<PropertyValueMap<{ label: string }>>().toEqualTypeOf<LitPropertyValueMap<{ label: string }>>();
    expectTypeOf<PropertyValues<{ label: string }>>().toEqualTypeOf<LitPropertyValues<{ label: string }>>();
    expectTypeOf<PropertyValues>().toEqualTypeOf<LitPropertyValues>();
  });

  it('hosts a controller written against Lit without adaptation', async () => {
    const hostConnected = vi.fn();
    const hostUpdate = vi.fn();
    const hostUpdated = vi.fn();

    class LitController implements LitReactiveController {
      constructor(readonly host: LitReactiveControllerHost) {
        host.addController(this);
      }

      hostConnected() {
        hostConnected();
      }

      hostUpdate() {
        hostUpdate();
      }

      hostUpdated() {
        hostUpdated();
      }
    }

    class TestElement extends ReactiveElement {
      readonly controller = new LitController(this);
    }

    customElements.define('lit-compatible-controller-host', TestElement);

    // SAFETY: The tag is registered with TestElement immediately above.
    const element = document.createElement('lit-compatible-controller-host') as TestElement;

    document.body.append(element);
    await element.updateComplete;

    expect(hostConnected).toHaveBeenCalledOnce();
    expect(hostUpdate).toHaveBeenCalledOnce();
    expect(hostUpdated).toHaveBeenCalledOnce();
  });
});
