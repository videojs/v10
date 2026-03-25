import type { MuxMediaError } from '@videojs/core/dom/media/mux';
import { MuxCustomMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { emitMuxError, emitMuxHeartbeat, type Metadata, setupMuxData, updateMuxHlsEngine } from './mux-data';

export class MuxVideo extends MediaAttachMixin(MuxCustomMedia) {
  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'drm-token', 'env-key'];
  }

  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  #destroyMuxData: (() => void) | null = null;
  #metadata: Partial<Metadata> = {};

  get metadata(): Partial<Metadata> {
    return this.#metadata;
  }

  set metadata(value: Partial<Metadata>) {
    this.#metadata = value;
    if (this.#destroyMuxData) {
      emitMuxHeartbeat(this.target, value);
    }
  }

  constructor() {
    super();
    this.attach(this.target);
  }

  connectedCallback(): void {
    super.connectedCallback?.();
    this.#startMuxMonitoring();
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName !== 'src') {
      super.attributeChangedCallback(attrName, oldValue, newValue);
    }

    if (attrName === 'src' && oldValue !== newValue) {
      this.src = newValue ?? '';
      // DRM may have recreated the hls.js engine — update the mux monitor if active.
      if (this.#destroyMuxData && this.engine) {
        updateMuxHlsEngine(this.target, this.engine);
      }
    }

    if (attrName === 'drm-token' && oldValue !== newValue) {
      this.drmToken = newValue;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.#stopMuxMonitoring();
      this.destroy();
    }
  }

  #startMuxMonitoring(): void {
    const { engine } = this;
    // Native playback path (MSE unavailable) — skip hls.js-dependent monitoring.
    if (!engine) return;

    const envKey = this.getAttribute('env-key');
    this.#destroyMuxData = setupMuxData(this.target, engine, {
      envKey,
      metadata: this.#metadata,
    });
    this.target.addEventListener('muxerror', this.#onMuxError);
  }

  #stopMuxMonitoring(): void {
    this.target.removeEventListener('muxerror', this.#onMuxError);
    this.#destroyMuxData?.();
    this.#destroyMuxData = null;
  }

  #onMuxError = (event: Event): void => {
    const error = (event as CustomEvent<MuxMediaError>).detail;
    if (error.fatal) {
      emitMuxError(this.target, error);
    }
  };
}
