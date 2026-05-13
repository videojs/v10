import type { MenuState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { menuContext } from './context';

export class MenuLabelElement extends ContextPartElement<MenuState> {
  static readonly tagName = 'media-menu-label';

  protected readonly consumer = new ContextConsumer(this, { context: menuContext, subscribe: true });
}
