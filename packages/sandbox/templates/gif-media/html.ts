import { GifMedia } from './gif-media';

export class GifMediaElement extends HTMLElement {
  static readonly tagName = 'gif-video';
  static readonly observedAttributes = ['src'];

  readonly #gifMedia = new GifMedia();

  connectedCallback(): void {
    // Opt in to container-mixin discovery
    this.setAttribute('data-media-element', '');

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; line-height: 0; }
          canvas { width: 100%; height: 100%; display: block; }
        </style>
        <canvas></canvas>
      `;
      const canvas = this.shadowRoot!.querySelector('canvas')!;
      this.#gifMedia.attach(canvas);
    }

    const src = this.getAttribute('src');
    if (src) this.#gifMedia.src = src;
  }

  disconnectedCallback(): void {
    this.removeAttribute('data-media-element');
    this.#gifMedia.detach();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'src') this.#gifMedia.src = value ?? '';
  }

  // Minimal media interface — only what playbackFeature actually needs
  get paused(): boolean {
    return this.#gifMedia.paused;
  }

  play(): Promise<void> {
    return this.#gifMedia.play();
  }

  pause(): void {
    this.#gifMedia.pause();
  }

  // EventTarget delegation so listen() calls in features work correctly
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.#gifMedia.addEventListener(type, listener, options);
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void {
    this.#gifMedia.removeEventListener(type, listener, options);
  }

  override dispatchEvent(event: Event): boolean {
    return this.#gifMedia.dispatchEvent(event);
  }
}
