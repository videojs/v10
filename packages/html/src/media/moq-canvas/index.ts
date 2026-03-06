import * as Watch from '@moq/watch';

const Moq = Watch.Lite;

/** Shim that wraps MoQ's BufferedRanges array as a TimeRanges-like object. */
function createTimeRanges(ranges: Array<{ start: number; end: number }>): TimeRanges {
  return {
    get length() {
      return ranges.length;
    },
    start(index: number) {
      if (index < 0 || index >= ranges.length) throw new DOMException('Index out of bounds', 'IndexSizeError');
      return ranges[index]!.start / 1000;
    },
    end(index: number) {
      if (index < 0 || index >= ranges.length) throw new DOMException('Index out of bounds', 'IndexSizeError');
      return ranges[index]!.end / 1000;
    },
  };
}

const EMPTY_TIME_RANGES = createTimeRanges([]);

// Static template — no dynamic content.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /*html*/ `
  <style>
    :host {
      display: inline-block;
      line-height: 0;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      min-width: 100%;
      min-height: 100%;
      object-fit: var(--media-object-fit, contain);
      object-position: var(--media-object-position, 50% 50%);
    }
  </style>
  <canvas part="canvas"></canvas>
`;

// Close everything when this element is garbage collected.
// There's no destructor for web components so this is the best we can do.
const cleanup = new FinalizationRegistry<Watch.Signals.Effect>((signals) => signals.close());

/**
 * WebCodecs-backed MoQ media element.
 *
 * Creates a `<canvas>` in shadow DOM and uses the MoQ JS API to manage
 * connection, broadcast, and decoding. Synthesizes the HTMLMediaElement
 * interface from MoQ signals so Video.js can treat it as a media element.
 */
export class MoqCanvas extends HTMLElement {
  static readonly observedAttributes = ['src', 'name', 'muted', 'volume', 'autoplay'] as const;

  // A MoQ connection that is automatically re-established on drop.
  #connection = new Moq.Connection.Reload({
    // Immediately start connecting once a URL is set, even if not in the DOM.
    enabled: true,
  });

  // The MoQ broadcast being fetched.
  #broadcast = new Watch.Broadcast({
    connection: this.#connection.established,
    // Start fetching the catalog even if not in the DOM.
    enabled: true,
    // Default to an empty namespace, so the player can work with just a URL.
    name: Moq.Path.empty(),
  });

  // NOTE: We're using the advanced WebCodecs backend here to improve tree-shaking.
  // This is not really required, but it's a good example of the customizability of the MoQ JS API.
  // ex. A moq-audio element would omit the video stuff.

  // Used to synchronize audio and video playback.
  #sync = new Watch.Sync();

  // Create a source, decoder, and renderer for video.
  #videoSource = new Watch.Video.Source(this.#sync, { broadcast: this.#broadcast });
  #videoDecoder = new Watch.Video.Decoder(this.#videoSource);
  #videoRenderer: Watch.Video.Renderer;

  // Create a source, decoder, and emitter for audio.
  #audioSource = new Watch.Audio.Source(this.#sync, { broadcast: this.#broadcast });
  #audioDecoder = new Watch.Audio.Decoder(this.#audioSource);
  #audioEmitter = new Watch.Audio.Emitter(this.#audioDecoder, { paused: false });

  #canvas: HTMLCanvasElement;

  #signals = new Watch.Signals.Effect();

  constructor() {
    super();

    cleanup.register(this, this.#signals);
    this.#signals.cleanup(() => {
      this.#connection.close();
      this.#broadcast.close();
      this.#sync.close();
      this.#videoSource.close();
      this.#videoDecoder.close();
      this.#audioSource.close();
      this.#audioDecoder.close();
      this.#audioEmitter.close();
      this.#videoRenderer.close();
    });

    // Mark as media element for container discovery.
    this.setAttribute('data-media', '');

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(TEMPLATE.content.cloneNode(true));

    this.#canvas = shadow.querySelector('canvas')!;
    this.#videoRenderer = new Watch.Video.Renderer(this.#videoDecoder, {
      canvas: this.#canvas,
      // TODO Based on autoplay?
      paused: false,
    });

    this.#signals.subscribe(this.#broadcast.status, (status) => {
      if (status === 'live') {
        this.dispatchEvent(new Event('loadedmetadata'));
        this.dispatchEvent(new Event('loadeddata'));
        this.dispatchEvent(new Event('canplay'));
        this.dispatchEvent(new Event('canplaythrough'));
      }
    });

    this.#signals.subscribe(this.#videoRenderer.paused, (paused) => {
      this.dispatchEvent(new Event(paused ? 'pause' : 'play'));
    });

    this.#signals.subscribe(this.#videoDecoder.timestamp, () => {
      this.dispatchEvent(new Event('timeupdate'));
    });

    this.#signals.subscribe(this.#videoDecoder.stalled, (stalled) => {
      this.dispatchEvent(new Event(stalled ? 'waiting' : 'playing'));
    });

    this.#signals.subscribe(this.#audioEmitter.volume, () => {
      this.dispatchEvent(new Event('volumechange'));
    });

    this.#signals.subscribe(this.#audioEmitter.muted, () => {
      this.dispatchEvent(new Event('volumechange'));
    });

    this.#signals.subscribe(this.#videoDecoder.buffered, () => {
      this.dispatchEvent(new Event('progress'));
    });
  }

  connectedCallback(): void {
    this.dispatchEvent(new Event('loadstart'));
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (attrName === 'src') {
      this.src = newValue ?? '';
    } else if (attrName === 'name') {
      this.#broadcast.name.set(newValue ? Moq.Path.from(newValue) : Moq.Path.empty());
    } else if (attrName === 'muted') {
      this.#audioEmitter.muted.set(newValue !== null);
    } else if (attrName === 'volume') {
      this.#audioEmitter.volume.set(newValue ? Number.parseFloat(newValue) : 1);
    } else if (attrName === 'autoplay') {
      if (newValue !== null) {
        this.play();
      }
    }
  }

  // --- HTMLMediaElement-like interface ---

  get src(): string {
    return this.#connection.url.peek()?.toString() ?? '';
  }

  set src(value: string) {
    this.#connection.url.set(value ? new URL(value) : undefined);
    if (value) this.dispatchEvent(new Event('loadstart'));
  }

  get currentSrc(): string {
    return this.src;
  }

  get paused(): boolean {
    return this.#videoRenderer.paused.peek();
  }

  play(): Promise<void> {
    this.#videoRenderer.paused.set(false);
    this.#audioEmitter.paused.set(false);
    return Promise.resolve();
  }

  pause(): void {
    this.#videoRenderer.paused.set(true);
    this.#audioEmitter.paused.set(true);
  }

  load(): void {
    // No-op — MoQ manages the connection lifecycle.
  }

  get volume(): number {
    return this.#audioEmitter.volume.peek();
  }

  set volume(value: number) {
    this.#audioEmitter.volume.set(value);
  }

  get muted(): boolean {
    return this.#audioEmitter.muted.peek();
  }

  set muted(value: boolean) {
    this.#audioEmitter.muted.set(value);
  }

  get currentTime(): number {
    return (this.#videoDecoder.timestamp.peek() ?? 0) / 1000;
  }

  set currentTime(_value: number) {
    // Live-only — seeking is not supported.
  }

  get duration(): number {
    return Number.POSITIVE_INFINITY;
  }

  get readyState(): number {
    const status = this.#broadcast.status.peek();
    if (status === 'live') {
      return this.#videoDecoder.stalled.peek() ? 2 : 4;
    }
    if (status === 'loading') return 1;
    return 0;
  }

  get networkState(): number {
    const status = this.#broadcast.status.peek();
    if (status === 'live' || status === 'loading') return 2;
    return 0;
  }

  get buffered(): TimeRanges {
    const ranges = this.#videoDecoder.buffered.peek();
    if (!ranges.length) return EMPTY_TIME_RANGES;
    return createTimeRanges(ranges);
  }

  get seekable(): TimeRanges {
    return EMPTY_TIME_RANGES;
  }

  get played(): TimeRanges {
    return EMPTY_TIME_RANGES;
  }

  get ended(): boolean {
    return false;
  }

  get playbackRate(): number {
    return 1;
  }

  set playbackRate(_value: number) {}

  get defaultPlaybackRate(): number {
    return 1;
  }

  set defaultPlaybackRate(_value: number) {}

  get defaultMuted(): boolean {
    return this.hasAttribute('muted');
  }

  set defaultMuted(value: boolean) {
    this.toggleAttribute('muted', value);
  }

  get autoplay(): boolean {
    return this.hasAttribute('autoplay');
  }

  set autoplay(value: boolean) {
    this.toggleAttribute('autoplay', value);
  }

  get loop(): boolean {
    return false;
  }

  set loop(_value: boolean) {}

  get controls(): boolean {
    return false;
  }

  get preload(): string {
    return 'none';
  }

  get error(): MediaError | null {
    return null;
  }

  get videoWidth(): number {
    return this.#canvas.width;
  }

  get videoHeight(): number {
    return this.#canvas.height;
  }

  get poster(): string {
    return '';
  }

  set poster(_value: string) {}
}
