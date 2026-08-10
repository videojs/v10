import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectMetadata, selectPlayback } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

const SHADOW_CSS = `\
:host {
  display: block;
}
img {
  display: block;
}
img[hidden] {
  display: none;
}`;

/**
 * `<media-poster>` — displays the poster image and hides it once playback starts.
 *
 * Owns an `<img part="img">` in a shadow root, alongside a slot for an image of
 * your own. Supply one and this element's image steps aside, so `srcset`,
 * `loading`, and `<picture>` stay available. Supply nothing and the resolved
 * `poster` is rendered for you, which is why the URL is set on the player
 * rather than here.
 *
 * Composes `playback` for visibility and `metadata` for the URL, so it doesn't
 * extend `MediaUIElement`: that base couples an element to a single feature
 * selector.
 */
export class PosterElement extends MediaElement {
  static readonly tagName = 'media-poster';

  readonly #core = new PosterCore();
  readonly #img = document.createElement('img');
  readonly #slot = document.createElement('slot');

  readonly #playback = new PlayerController(this, playerContext, selectPlayback);
  readonly #metadata = new PlayerController(this, playerContext, selectMetadata);

  #disconnect: AbortController | null = null;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;

    // The image is decorative: it carries a URL the player resolved, and
    // nothing here knows what it depicts. Describe a poster that means
    // something by supplying your own image with an `alt`.
    this.#img.alt = '';
    this.#img.setAttribute('part', 'img');
    this.#img.setAttribute('decoding', 'async');

    shadow.append(style, this.#slot, this.#img);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    // Whether the author has supplied an image can change after connection.
    // The shadow slot's own `slotchange` doesn't escape the shadow root, and a
    // change to a skin's forwarding slot bubbles to this host instead, so both
    // need listening to.
    this.#slot.addEventListener('slotchange', () => this.requestUpdate(), { signal });
    this.addEventListener('slotchange', () => this.requestUpdate(), { signal });

    this.#img.addEventListener('load', () => this.#markLoaded(), { signal });

    if (__DEV__ && !this.#playback.value) {
      logMissingFeature(this.localName, this.#playback.displayName ?? 'playback');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const playback = this.#playback.value;
    if (!playback) return;

    // The metadata feature is optional: without it nothing resolves a URL, and
    // this stays a visibility wrapper around whatever the author supplied.
    this.#core.setMedia({
      started: playback.started,
      poster: this.#metadata.value?.poster ?? '',
    });

    const state = this.#core.getState();
    applyStateDataAttrs(this, state, PosterDataAttrs);

    this.#applyImage(state.src);
  }

  /**
   * Whether the author supplied an image.
   *
   * A skin forwards its own `<slot name="poster">` into this element, and that
   * empty slot is itself an assigned node — so counting assigned nodes would
   * always find one. Flattening resolves the chain to what the author actually
   * put there.
   */
  get #hasAuthorImage(): boolean {
    return this.#slot.assignedElements({ flatten: true }).length > 0;
  }

  #applyImage(src: string): void {
    const owned = src !== '' && !this.#hasAuthorImage;

    this.#img.hidden = !owned;

    if (!owned) {
      // An image that isn't rendered still downloads its `src`.
      this.#img.removeAttribute('src');
      this.removeAttribute('data-loaded');
      return;
    }

    if (this.#img.getAttribute('src') !== src) {
      this.removeAttribute('data-loaded');
      this.#img.setAttribute('src', src);
    }

    this.#markLoaded();
  }

  /**
   * Reported on the host rather than the image, because a selector can't reach
   * past `::part()` to read an attribute.
   */
  #markLoaded(): void {
    // A cached image can already be complete, in which case `load` never fires.
    if (this.#img.complete && this.#img.naturalWidth > 0) this.setAttribute('data-loaded', '');
  }
}
