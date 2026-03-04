import {
  type MediaTextTrackState,
  mapCuesToThumbnails,
  ThumbnailCore,
  ThumbnailDataAttrs,
  type ThumbnailImage,
  type ThumbnailResizeResult,
} from '@videojs/core';
import type { ThumbnailApi } from '@videojs/core/dom';
import { applyElementProps, applyStateDataAttrs, createThumbnail, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

const SHADOW_CSS = `\
:host {
  display: inline-block;
  overflow: hidden;
}
img {
  display: block;
}`;

export class ThumbnailElement extends MediaElement {
  static readonly tagName = 'media-thumbnail';

  static override properties = {
    time: { type: Number },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    loading: { type: String },
    fetchPriority: { type: String, attribute: 'fetchpriority' },
  } satisfies PropertyDeclarationMap<keyof ThumbnailCore.Props>;

  time = 0;
  crossOrigin: ThumbnailCore.Props['crossOrigin'];
  loading: ThumbnailCore.Props['loading'];
  fetchPriority: ThumbnailCore.Props['fetchPriority'];

  readonly #core = new ThumbnailCore();
  readonly #img = document.createElement('img');
  readonly #textTracks = new PlayerController(this, playerContext, selectTextTrack);

  #thumbnails: ThumbnailImage[] = [];
  #externalThumbnails: ThumbnailImage[] | undefined;
  #lastTextTrack: MediaTextTrackState | undefined;
  #api: ThumbnailApi | null = null;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    shadow.appendChild(style);

    this.#img.alt = '';
    this.#img.setAttribute('part', 'img');
    this.#img.setAttribute('aria-hidden', 'true');
    this.#img.setAttribute('decoding', 'async');
    shadow.appendChild(this.#img);
  }

  /**
   * Set thumbnail images directly, bypassing the automatic `<track>` detection.
   * When set, this takes priority over the text track path.
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

    this.#api = createThumbnail({
      getContainer: () => this,
      getImg: () => this.#img,
      onStateChange: () => this.requestUpdate(),
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#api?.destroy();
    this.#api = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    // Resolve thumbnails: external prop takes priority over auto <track> path.
    if (this.#externalThumbnails) {
      this.#thumbnails = this.#externalThumbnails;
    } else {
      const textTrack = this.#textTracks.value;

      if (textTrack !== this.#lastTextTrack) {
        this.#lastTextTrack = textTrack;
        this.#thumbnails =
          textTrack && textTrack.thumbnailCues.length > 0
            ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
            : [];
      }
    }

    const thumbnail = this.#core.findActiveThumbnail(this.#thumbnails, this.time);

    // Sync img attributes from element properties.
    applyElementProps(this.#img, {
      crossorigin: this.crossOrigin || undefined,
      loading: this.loading,
      fetchpriority: this.fetchPriority,
    });

    // Track src changes via the handle.
    this.#api?.updateSrc(thumbnail?.url);

    if (!thumbnail) {
      this.#img.removeAttribute('src');
      this.#resetStyles();

      const state = this.#core.getState(false, false, undefined);
      applyElementProps(this, this.#core.getAttrs(state));
      applyStateDataAttrs(this, state, ThumbnailDataAttrs);
      return;
    }

    // Set the img src directly (imperative DOM).
    if (this.#img.getAttribute('src') !== thumbnail.url) {
      this.#img.src = thumbnail.url;
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

  #applyResize(result: ThumbnailResizeResult): void {
    this.style.width = `${result.containerWidth}px`;
    this.style.height = `${result.containerHeight}px`;

    const imgStyle = this.#img.style;
    imgStyle.width = `${result.imageWidth}px`;
    imgStyle.height = `${result.imageHeight}px`;
    imgStyle.maxWidth = 'none';
    imgStyle.transform =
      result.offsetX || result.offsetY ? `translate(-${result.offsetX}px, -${result.offsetY}px)` : '';
  }

  #resetStyles(): void {
    this.style.width = '';
    this.style.height = '';

    const imgStyle = this.#img.style;
    imgStyle.width = '';
    imgStyle.height = '';
    imgStyle.maxWidth = '';
    imgStyle.transform = '';
  }
}
