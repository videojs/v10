import type { MenuState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { menuContext } from './context';

/** Custom element shell for the `<media-menu-label>` tag — non-interactive label inside a menu or menu group. */
export class MenuLabelElement extends ContextPartElement<MenuState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-menu-label';

  protected readonly consumer = new ContextConsumer(this, { context: menuContext, subscribe: true });
}
