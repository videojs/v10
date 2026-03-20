import type { AnyConstructor } from '@videojs/utils/types';

type AnyClass = abstract new (...args: any[]) => any;

function getSettableProps(DelegateClass: AnyClass): Set<string> {
  const props = new Set<string>();
  for (let proto = DelegateClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc?.set) props.add(key);
    }
  }
  return props;
}

/**
 * Mixin that intercepts `getTemplateHTML` and `attributeChangedCallback` to
 * handle delegate-owned properties. Delegate props are stripped from template
 * HTML attrs and routed through the property setter in `attributeChangedCallback`
 * instead of being forwarded to the inner native element.
 */
export function MediaPropsMixin<Base extends AnyConstructor<HTMLElement>>(
  BaseClass: Base,
  DelegateClass: AnyClass
): Base {
  const delegateProps = getSettableProps(DelegateClass);

  class MediaPropsElement extends (BaseClass as any) {
    static get observedAttributes(): string[] {
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      return [...new Set([...(super.observedAttributes ?? []), ...delegateProps])];
    }

    static getTemplateHTML(attrs: Record<string, string>): string {
      const filtered = { ...attrs };
      for (const key of delegateProps) {
        delete filtered[key];
      }
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      return super.getTemplateHTML(filtered);
    }

    attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
      if (delegateProps.has(attrName)) {
        if (oldValue !== newValue) {
          (this as any)[attrName] = typeof (this as any)[attrName] === 'boolean' ? newValue !== null : (newValue ?? '');
        }
        return;
      }

      super.attributeChangedCallback?.(attrName, oldValue, newValue);
    }
  }

  return MediaPropsElement as unknown as Base;
}
