import type { Mixin } from '@videojs/utils/types';

import { ReactiveElement } from '@lit/reactive-element';

import { StoreMixin } from './store';

/**
 * Frosted skin custom element.
 *
 * Uses shadow DOM with a slot for video elements. Controls will be added in future updates.
 *
 * @example Basic usage (after calling define)
 * ```html
 * <vjs-frosted-skin>
 *   <video src="video.mp4"></video>
 * </vjs-frosted-skin>
 * ```
 *
 * @example Define with default tag
 * ```ts
 * import { FrostedSkinElement } from '@videojs/html/skins/frosted';
 * FrostedSkinElement.define();
 * ```
 *
 * @example Define with custom tag
 * ```ts
 * FrostedSkinElement.define('my-player');
 * ```
 *
 * @example Define with extended store
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { extendConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
 *
 * const { StoreMixin } = createStore(extendConfig({ features: [chaptersFeature] }));
 * FrostedSkinElement.define('my-player', StoreMixin);
 * ```
 */
export class FrostedSkinElement extends ReactiveElement {
  static tagName = 'vjs-frosted-skin';

  /**
   * Registers this element with the custom elements registry.
   *
   * @param tagName - Custom element tag name (defaults to 'vjs-frosted-skin')
   * @param mixin - Mixin to apply (defaults to StoreMixin)
   */
  static define(tagName = this.tagName, mixin: Mixin<FrostedSkinElement, ReactiveElement> = StoreMixin): void {
    customElements.define(tagName, mixin(this));
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<slot></slot>';
  }
}
