import { HTMLVideoAdapter } from '@videojs/media/dom';
import { MediaTracksMixin } from '@videojs/media/media-tracks';

import type { DashAdapterProps, DashSource } from './adapter';

export type { DashEngineConfig, DashAdapterProps, DashSource } from './adapter';

/** An inert DASH host used when the package is evaluated outside a browser. */
export class DashAdapter extends MediaTracksMixin(HTMLVideoAdapter) implements DashAdapterProps {
  static readonly defaultProps: DashAdapterProps = {
    src: '',
    source: null,
  };

  readonly engine = null;
  #src = DashAdapter.defaultProps.src;
  #source: DashSource | null = DashAdapter.defaultProps.source;

  get src() {
    return this.#src;
  }

  set src(value) {
    const { engine } = this.#source ?? {};
    const source: DashSource = { ...(engine && { engine }), ...(value && { src: value }) };

    this.source = Object.keys(source).length > 0 ? source : null;
  }

  get source() {
    return this.#source;
  }

  set source(value) {
    const source = value ?? null;
    if (source === this.#source) return;

    this.#source = source;
    this.#src = source?.src ?? '';

    this.dispatchEvent(new Event('sourcechange'));
  }
}
