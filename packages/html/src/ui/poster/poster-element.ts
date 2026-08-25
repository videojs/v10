import { PosterCore, PosterDataAttrs, type PosterImageLoadState } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectMetadata, selectPlayback } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { UIElement } from '../ui-element';

/** What an element composes: whatever fills a slot, or the element's own children. */
function composedChildren(element: Element): Element[] {
  if (element instanceof HTMLSlotElement) {
    const assigned = element.assignedElements();
    if (assigned.length > 0) return assigned;
  }

  return [...element.children];
}

/**
 * The first image an element composes. A skin forwards its own `<slot name="poster">` in, so the image is a slot or two
 * down and may be wrapped in a `<picture>` or a framework image component.
 */
function findImage(element: Element): HTMLImageElement | null {
  for (const child of composedChildren(element)) {
    if (child instanceof HTMLImageElement) return child;

    const nested = findImage(child);
    if (nested) return nested;
  }

  return null;
}

/**
 * Whether anything already points this image somewhere, which answers both whether the author owns the source and
 * whether there is a download to wait for. A `<source>` counts: inside a `<picture>` it can win over the `src`.
 */
function hasSource(img: HTMLImageElement): boolean {
  if (img.hasAttribute('src') || img.hasAttribute('srcset')) return true;

  const parent = img.parentElement;

  return parent?.localName === 'picture' && parent.querySelector('source') !== null;
}

/**
 * Whether `complete` on this image describes a request. It is also true for one that omits both `src` and `srcset`,
 * whatever a parent `<picture>` is fetching on its behalf, so only an image sourced from its own attributes can be
 * read.
 */
function hasOwnSource(img: HTMLImageElement): boolean {
  return !!img.getAttribute('src') || img.hasAttribute('srcset');
}

/** How the current source is faring. */
type ImageLoadState = 'pending' | 'loaded' | 'error';

/**
 * `<media-poster>` — sets `src` on a poster image it does not own.
 *
 * The image is a child, as in `<picture>`, but sourcing runs the other way around: `<picture>` treats the `src` on its
 * `<img>` as the fallback, while here an image with no source of its own is the one this element fills in. Give the
 * child a `src`, a `srcset`, or `<source>` candidates and it is yours, left alone.
 *
 * Renders no image of its own, so include one: `<media-poster><img alt=""></media-poster>`. Inside a skin, an `<img
 * slot="poster">` of yours replaces the one the skin carries.
 */
export class PosterElement extends UIElement {
  static readonly tagName = 'media-poster';

  readonly #core = new PosterCore();
  readonly #children = new MutationObserver(() => this.requestUpdate());

  readonly #playback = new PlayerController(this, playerContext, selectPlayback);
  readonly #metadata = new PlayerController(this, playerContext, selectMetadata);

  #image: HTMLImageElement | null = null;
  /** Whether `#image` had no source of its own when it became active. */
  #owned = false;
  #imageLoadState: ImageLoadState = 'pending';

  #imageEvents: AbortController | null = null;
  #disconnect: AbortController | null = null;
  #warnedMissingImage = false;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    // Two ways the image can change: a skin's forwarding slot fills or empties,
    // which bubbles here, or a child is added or removed, which announces nothing.
    this.addEventListener('slotchange', () => this.requestUpdate(), { signal });
    this.#children.observe(this, { childList: true, subtree: true });

    if (__DEV__ && !this.#playback.value) {
      logMissingFeature(this.localName, this.#playback.displayName ?? 'playback');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    this.#adopt(null);
    this.#children.disconnect();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  get #loadState(): PosterImageLoadState {
    if (!this.#image || !hasSource(this.#image)) return 'none';

    return this.#imageLoadState === 'pending' ? 'loading' : this.#imageLoadState;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const playback = this.#playback.value;
    if (!playback) return;

    // `metadata` is optional: without it nothing resolves a URL, and this stays
    // a visibility wrapper around whatever the author supplied.
    this.#core.setMedia({
      started: playback.started,
      poster: this.#metadata.value?.poster ?? '',
    });

    const { src } = this.#core.getState();

    this.#adopt(findImage(this));
    this.#applySource(src);

    this.#core.setImageLoadState(this.#loadState);
    applyStateDataAttrs(this, this.#core.getState(), PosterDataAttrs);
  }

  /**
   * Ownership is settled once, when an image becomes active: after the first fill the `src` we set would itself look
   * authored. Re-slot an image with a source to hand it back, the way React decides a field is controlled at mount.
   */
  #adopt(next: HTMLImageElement | null): void {
    if (next === this.#image) return;

    // An image that steps aside keeps downloading whatever we pointed it at.
    if (this.#owned) this.#image?.removeAttribute('src');

    this.#imageEvents?.abort();
    this.#imageEvents = null;

    this.#image = next;
    this.#owned = next !== null && !hasSource(next);
    this.#imageLoadState = 'pending';

    if (!next) return;

    // An image that finished before we started listening never fires again, so
    // its load state has to be read off it. Decoded pixels stand on their own;
    // the absence of them only means failure once `complete` can be trusted.
    if (next.naturalWidth > 0) this.#imageLoadState = 'loaded';
    else if (next.complete && hasOwnSource(next)) this.#imageLoadState = 'error';

    this.#imageEvents = new AbortController();
    const { signal } = this.#imageEvents;
    const settle = (loadState: ImageLoadState) => () => {
      this.#imageLoadState = loadState;
      this.requestUpdate();
    };

    next.addEventListener('load', settle('loaded'), { signal });
    next.addEventListener('error', settle('error'), { signal });
  }

  #applySource(src: string): void {
    const img = this.#image;

    if (!img) {
      if (__DEV__ && src && !this.#warnedMissingImage) {
        this.#warnedMissingImage = true;
        console.warn(
          `<${this.localName}> resolved a poster but has no image to put it in. ` +
            `Add one as a child: <${this.localName}><img alt=""></${this.localName}>`
        );
      }

      return;
    }

    if (!this.#owned) return;

    if (!src) {
      this.#imageLoadState = 'pending';
      img.removeAttribute('src');
    } else if (img.getAttribute('src') !== src) {
      // Reset before the write, not after: how the last source fared says
      // nothing about this one, and the write itself can settle it.
      this.#imageLoadState = 'pending';
      img.setAttribute('src', src);
    }
  }
}
