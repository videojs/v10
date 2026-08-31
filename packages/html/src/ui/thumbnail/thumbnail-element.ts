import {
  mapCuesToThumbnails,
  ThumbnailCore,
  ThumbnailDataAttrs,
  type ThumbnailImage,
  type ThumbnailResizeResult,
} from '@videojs/core';
import type { ThumbnailApi } from '@videojs/core/dom';
import { applyElementProps, applyStateDataAttrs, createThumbnail, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import type { MediaTextTrackState } from '@videojs/media';

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

/** Find the first image composed inside the thumbnail, including through a forwarding slot. */
function findImage(element: Element): HTMLImageElement | null {
  for (const child of composedChildren(element)) {
    if (child instanceof HTMLImageElement) return child;

    const nested = findImage(child);
    if (nested) return nested;
  }

  return null;
}

/**
 * `<media-thumbnail>` — resolves and sizes a time-based thumbnail into an image supplied as a child.
 *
 * The element owns `src` and `srcset` on the active image. It renders no image of its own, so include one:
 * `<media-thumbnail time="12"><img alt=""></media-thumbnail>`.
 */
export class ThumbnailElement extends UIElement {
  static readonly tagName = 'media-thumbnail';

  static override properties = {
    time: { type: Number },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    loading: { type: String },
    fetchPriority: { type: String, attribute: 'fetchpriority' },
  } satisfies PropertyDeclarationMap<Exclude<keyof ThumbnailCore.Props, 'thumbnails'>>;

  time = 0;
  crossOrigin: ThumbnailCore.Props['crossOrigin'];
  loading: ThumbnailCore.Props['loading'];
  fetchPriority: ThumbnailCore.Props['fetchPriority'];

  readonly #core = new ThumbnailCore();
  readonly #children = new MutationObserver(() => this.requestUpdate());
  readonly #textTracks = new PlayerController(this, playerContext, selectTextTrack);

  #img: HTMLImageElement | null = null;
  #thumbnails: ThumbnailImage[] = [];
  #externalThumbnails: ThumbnailImage[] | undefined;
  #lastTextTrack: MediaTextTrackState | undefined;
  #api: ThumbnailApi | null = null;
  #warnedMissingImage = false;

  /**
   * Set thumbnail images directly, bypassing the automatic `<track>` detection. When set, this takes priority over the
   * text track path.
   */
  get thumbnails(): ThumbnailImage[] | undefined {
    return this.#externalThumbnails;
  }

  set thumbnails(value: ThumbnailImage[] | undefined) {
    this.#externalThumbnails = value;
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.destroyed) return;

    this.#api = createThumbnail({
      getContainer: () => this,
      getImg: () => this.#img,
      onStateChange: () => this.requestUpdate(),
    });
    this.#children.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset'],
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    this.#adopt(null);
    this.#children.disconnect();
    this.#api?.destroy();
    this.#api = null;
  }

  override destroyCallback(): void {
    this.#api?.destroy();
    super.destroyCallback();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const textTrack = this.#textTracks.value;

    // Resolve thumbnails: external prop takes priority over auto <track> path.
    if (this.#externalThumbnails) {
      this.#thumbnails = this.#externalThumbnails;
    } else if (textTrack !== this.#lastTextTrack) {
      this.#lastTextTrack = textTrack;
      this.#thumbnails =
        textTrack && textTrack.thumbnailCues.length > 0
          ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
          : [];
    }

    const thumbnail = this.#core.findActiveThumbnail(this.#thumbnails, this.time);
    const img = findImage(this);

    this.#adopt(img);

    // Sync img attributes from element properties.
    if (img) {
      applyElementProps(img, {
        crossorigin: this.#core.resolveCrossOrigin(this.crossOrigin, this.#inheritedCrossOrigin(textTrack)),
        loading: this.loading,
        fetchpriority: this.fetchPriority,
      });
    }

    // Track src changes via the thumbnail API.
    this.#api?.updateSrc(img ? thumbnail?.url : undefined);
    this.#applySource(thumbnail?.url);
    this.#api?.connect();

    if (!thumbnail) {
      this.#resetStyles();

      const state = this.#core.getState(false, false, undefined);

      applyElementProps(this, this.#core.getAttrs(state));
      applyStateDataAttrs(this, state, ThumbnailDataAttrs);
      return;
    }

    const api = this.#api;
    const state = this.#core.getState(api?.loading ?? false, api?.error ?? false, thumbnail);

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, ThumbnailDataAttrs);

    if (api?.naturalWidth && api.naturalHeight) {
      const constraints = api.readConstraints();
      const result = this.#core.resize(thumbnail, api.naturalWidth, api.naturalHeight, constraints);

      if (result) {
        this.#applyResize(result);
      }
    }
  }

  /**
   * Leaving `crossOrigin` unset means "follow the media element", so thumbnails keep working on a CORS-enabled player
   * without a skin having to thread an attribute through. Only the `<track>` path inherits: `thumbnails` set directly
   * may point at a host that has nothing to do with the media element.
   */
  #inheritedCrossOrigin(textTrack: MediaTextTrackState | undefined): ThumbnailCore.Props['crossOrigin'] {
    return this.#externalThumbnails ? undefined : textTrack?.thumbnailTrackCrossOrigin;
  }

  #applyResize(result: ThumbnailResizeResult): void {
    this.style.width = `${result.containerWidth}px`;
    this.style.height = `${result.containerHeight}px`;

    const imgStyle = this.#img?.style;
    if (!imgStyle) return;

    imgStyle.width = `${result.imageWidth}px`;
    imgStyle.height = `${result.imageHeight}px`;
    imgStyle.maxWidth = 'none';
    imgStyle.transform =
      result.offsetX || result.offsetY ? `translate(-${result.offsetX}px, -${result.offsetY}px)` : '';
  }

  #resetStyles(): void {
    this.style.width = '';
    this.style.height = '';

    const imgStyle = this.#img?.style;
    if (!imgStyle) return;

    imgStyle.width = '';
    imgStyle.height = '';
    imgStyle.maxWidth = '';
    imgStyle.transform = '';
  }

  #adopt(next: HTMLImageElement | null): void {
    if (next === this.#img) return;

    const previous = this.#img;

    if (previous) {
      this.#api?.disconnectImg(previous);
      this.#resetStyles();
      previous.removeAttribute('src');
      previous.removeAttribute('srcset');
    }

    this.#img = next;

    // Reset the request even when the next image will receive the same URL. A
    // replacement image is a new download with its own lifecycle.
    this.#api?.updateSrc(undefined);
  }

  #applySource(src: string | undefined): void {
    const img = this.#img;

    if (!img) {
      if (__DEV__ && src && !this.#warnedMissingImage) {
        this.#warnedMissingImage = true;
        console.warn(
          `<${this.localName}> resolved a thumbnail but has no image to put it in. ` +
            `Add one as a child: <${this.localName}><img alt=""></${this.localName}>`
        );
      }

      return;
    }

    // A srcset candidate wins over src, so the root has to clear both parts of
    // the source contract before applying the selected thumbnail URL.
    img.removeAttribute('srcset');

    if (!src) img.removeAttribute('src');
    else if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  }
}
