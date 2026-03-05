import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/**
 * Mixin for skin elements that renders the template from a static
 * `getTemplateHTML` method and resolves `<slot name="media">` placeholders
 * by replacing them with the actual media element children.
 */
export function SkinMixin<Base extends Constructor<ReactiveElement>>(BaseClass: Base): Base {
  class SkinElement extends (BaseClass as Constructor<ReactiveElement>) {
    constructor(...args: any[]) {
      super(...args);

      const ctor = this.constructor as { getTemplateHTML?: () => string };

      if (ctor.getTemplateHTML) {
        const children = [...this.childNodes];
        this.innerHTML = ctor.getTemplateHTML();
        this.#resolveSlots(children);
      }
    }

    override connectedCallback(): void {
      // During innerHTML parsing, children aren't available in the constructor.
      // Resolve any remaining slotted elements before the container connects.
      this.#resolveSlots();
      super.connectedCallback();
    }

    #resolveSlots(nodes?: ChildNode[]): void {
      const slot = this.querySelector('slot[name="media"]');
      if (!slot) return;

      // Collect media from either the provided node list (constructor) or
      // from direct children that haven't been placed yet (connectedCallback).
      const media = nodes
        ? nodes.filter((n): n is HTMLElement => n instanceof HTMLElement && n.getAttribute('slot') === 'media')
        : [...this.querySelectorAll<HTMLElement>(':scope > [slot="media"]')];

      for (const el of media) slot.before(el);
      slot.remove();
    }
  }

  return SkinElement as unknown as Base;
}
