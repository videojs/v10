import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuBackElement extends MediaElement {
  static readonly tagName = 'media-menu-back';

  static override properties = {
    label: { type: String },
  } satisfies PropertyDeclarationMap<'label'>;

  label = 'Back';

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #bound = false;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#bound = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#bound = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (!this.#bound) {
      this.#bound = true;
      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: (event: MouseEvent) => {
            if (event.button !== 0) return;
            const currentCtx = this.#ctx.value;
            currentCtx?.parentMenu?.pop();
          },
          onPointerenter: () => {
            const currentCtx = this.#ctx.value;
            currentCtx?.menu.highlight(this, { focus: false });
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    applyElementProps(this, {
      role: 'button',
      'aria-label': this.label,
    });

    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
