import { type Media, renderHost } from '@videojs/media/dom';
import { namedNodeMapToObject } from '@videojs/utils/dom';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { backgroundVideoTemplate } from './template';

const HTMLElementBase = globalThis.HTMLElement ?? class {};

// Not a `CustomMediaElement`: a background video has no adapter and needs one attribute, not the full media API. It
// renders through the same `renderHost` the media elements use.
export class BackgroundVideoElement extends MediaAttachMixin(HTMLElementBase) {
  static readonly tagName = 'background-video';

  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static template = backgroundVideoTemplate;
  static get observedAttributes() {
    return ['src'];
  }

  constructor() {
    super();

    const ctor = this.constructor as typeof BackgroundVideoElement;

    renderHost(
      this,
      ctor.template,
      {
        ...namedNodeMapToObject(this.attributes),
        ...(!this.hasAttribute('nomuted') && { muted: '' }),
        ...(!this.hasAttribute('noloop') && { loop: '' }),
        ...(!this.hasAttribute('noautoplay') && { autoplay: '' }),
        playsinline: '',
        disableremoteplayback: '',
        disablepictureinpicture: '',
      },
      ctor.shadowRootOptions
    );

    // Neither Chrome or Firefox support setting the muted attribute
    // after using document.createElement.
    // Get around this by setting the muted property manually.
    this.target!.muted = !this.hasAttribute('nomuted');
  }

  // Register the inner <video> (not `this`) with the provider.
  getMediaTarget(): Media | null {
    return this.target;
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName === 'src' && oldValue !== newValue) {
      this.target!.src = newValue ?? '';
    }
  }

  get target(): HTMLVideoElement | null {
    const slotted = this.querySelector(':scope > [slot=media]');
    if (slotted instanceof HTMLVideoElement) return slotted;

    const video = this.querySelector('video') ?? this.shadowRoot?.querySelector('video');

    return video instanceof HTMLVideoElement ? video : null;
  }
}
