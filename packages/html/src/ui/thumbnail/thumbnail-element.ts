import {
  type MediaTextTrackState,
  mapCuesToThumbnails,
  type ThumbnailConstraints,
  ThumbnailCore,
  ThumbnailDataAttrs,
  type ThumbnailImage,
  type ThumbnailResizeResult,
} from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, selectTextTrack } from '@videojs/core/dom';
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
  } satisfies PropertyDeclarationMap<'time'>;

  time = 0;

  readonly #core = new ThumbnailCore();
  readonly #img = document.createElement('img');
  readonly #textTracks = new PlayerController(this, playerContext, selectTextTrack);

  #thumbnails: ThumbnailImage[] = [];
  #lastTextTrack: MediaTextTrackState | undefined;
  #imgNaturalWidth = 0;
  #imgNaturalHeight = 0;

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
    this.#img.addEventListener('load', this.#onImgLoad);
    shadow.appendChild(this.#img);
  }

  #onImgLoad = () => {
    this.#imgNaturalWidth = this.#img.naturalWidth;
    this.#imgNaturalHeight = this.#img.naturalHeight;
    this.requestUpdate();
  };

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const textTrack = this.#textTracks.value;

    if (textTrack !== this.#lastTextTrack) {
      this.#lastTextTrack = textTrack;
      this.#thumbnails =
        textTrack && textTrack.thumbnailCues.length > 0
          ? mapCuesToThumbnails(textTrack.thumbnailCues, textTrack.thumbnailTrackSrc ?? undefined)
          : [];
    }

    const thumbnail = this.#core.findActiveThumbnail(this.#thumbnails, this.time);
    const state = this.#core.getState(false, false, thumbnail);

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, ThumbnailDataAttrs);

    if (!thumbnail) {
      this.#img.removeAttribute('src');
      this.#resetStyles();
      return;
    }

    if (this.#img.getAttribute('src') !== thumbnail.url) {
      this.#img.src = thumbnail.url;
    }

    if (this.#imgNaturalWidth && this.#imgNaturalHeight) {
      const constraints = this.#parseConstraints();
      const result = this.#core.resize(thumbnail, this.#imgNaturalWidth, this.#imgNaturalHeight, constraints);

      if (result) {
        this.#applyResize(result);
      }
    }
  }

  #parseConstraints(): ThumbnailConstraints {
    const computed = getComputedStyle(this);
    const minW = parseFloat(computed.minWidth);
    const maxW = parseFloat(computed.maxWidth);
    const minH = parseFloat(computed.minHeight);
    const maxH = parseFloat(computed.maxHeight);

    return {
      minWidth: Number.isFinite(minW) ? minW : 0,
      maxWidth: Number.isFinite(maxW) ? maxW : Infinity,
      minHeight: Number.isFinite(minH) ? minH : 0,
      maxHeight: Number.isFinite(maxH) ? maxH : Infinity,
    };
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
