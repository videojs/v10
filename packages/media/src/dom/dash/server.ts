import { MediaTracksMixin } from '../../core/media-tracks';
import { HTMLVideoElementHost } from '../video-host';
import type { DashMediaProps, DashSource } from './media';

export type { DashEngineConfig, DashMediaProps, DashSource } from './media';

export const dashMediaDefaultProps: DashMediaProps = {
  src: '',
  source: null,
};

const DashMediaHost = MediaTracksMixin(HTMLVideoElementHost);

/** An inert DASH host used when the package is evaluated outside a browser. */
export class DashMedia extends DashMediaHost implements DashMediaProps {
  readonly engine = null;
  #src = dashMediaDefaultProps.src;
  #source: DashSource | null = dashMediaDefaultProps.source;

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
