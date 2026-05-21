import { applyElementProps, getMenuViewTransitionAttrs, PERSISTENT_MENU_VIEW_RESTING_STATE } from '@videojs/core/dom';
import { MediaElement } from '../media-element';

export class MenuViewElement extends MediaElement {
  static readonly tagName = 'media-menu-view';

  override connectedCallback(): void {
    super.connectedCallback();

    applyElementProps(
      this,
      getMenuViewTransitionAttrs(PERSISTENT_MENU_VIEW_RESTING_STATE, { root: true, persistent: true })
    );
  }
}
