import type { AnyConstructor } from '@videojs/utils/types';

type AnyClass = abstract new (...args: any[]) => any;

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function buildAttrPropMap(DelegateClass: AnyClass): Map<string, string> {
  const map = new Map<string, string>();
  for (let proto = DelegateClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key.startsWith('_')) continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc?.set) map.set(camelToKebab(key), key);
    }
  }
  return map;
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
  const attrToProp = buildAttrPropMap(DelegateClass);

  class MediaPropsElement extends (BaseClass as any) {
    static get observedAttributes(): string[] {
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      return [...new Set([...(super.observedAttributes ?? []), ...attrToProp.keys()])];
    }

    static getTemplateHTML(attrs: Record<string, string>): string {
      const filtered = { ...attrs };
      for (const attr of attrToProp.keys()) {
        delete filtered[attr];
      }
      // biome-ignore lint/complexity/noThisInStatic: intentional use of super
      return super.getTemplateHTML(filtered);
    }

    attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
      const prop = attrToProp.get(attrName);
      if (prop) {
        if (oldValue !== newValue) {
          (this as any)[prop] = typeof (this as any)[prop] === 'boolean' ? newValue !== null : (newValue ?? '');
        }
        return;
      }

      super.attributeChangedCallback?.(attrName, oldValue, newValue);
    }
  }

  return MediaPropsElement as unknown as Base;
}
