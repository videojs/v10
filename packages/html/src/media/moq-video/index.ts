import * as Moq from '@moq/lite';
import * as Watch from '@moq/watch';

import { CustomMediaMixin } from '@videojs/core/dom/media/custom-media-element';

const CustomVideo = CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' });

// Close everything when this element is garbage collected.
// There's no destructor for web components so this is the best we can do.
const cleanup = new FinalizationRegistry<Watch.Signals.Effect>((signals) => signals.close());

/**
 * MSE-backed MoQ media element.
 *
 * Wraps a native `<video>` element via CustomMediaMixin and uses the MoQ JS API
 * to feed media segments through Media Source Extensions. Properties like
 * `readyState` and `buffered` fall through to the native element.
 */
export class MoqVideo extends CustomVideo {
  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, name, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  static get observedAttributes(): string[] {
    return [...CustomVideo.observedAttributes, 'name'];
  }

  // A MoQ connection that is automatically re-established on drop.
  #connection = new Moq.Connection.Reload({
    // Immediately start connecting once a URL is set, even if not in the DOM.
    enabled: true,
  });

  // The MoQ broadcast being fetched.
  #broadcast = new Watch.Broadcast({
    // The connection to the MoQ server.
    connection: this.#connection.established,
    // Start fetching the catalog even if not in the DOM.
    enabled: true,
    // Default to an empty namespace, so the player can work with just a URL.
    name: Moq.Path.empty(),
  });

  // We use the advanced JS API here to improve tree-shaking.
  // ex. A moq-audio element would omit the video stuff.

  // Used to synchronize audio and video playback.
  #sync = new Watch.Sync();

  // Responsible for combining the audio and video sourceBuffers.
  // TODO: This currently doesn't support adding/removing tracks after the fact.
  #muxer = new Watch.Mse.Muxer(this.#sync, { paused: false });

  // Create a source for the video stream.
  #videoSource = new Watch.Video.Source(this.#sync, { broadcast: this.#broadcast });
  #videoMse = new Watch.Video.Mse(this.#muxer, this.#videoSource);

  // Create a source for the audio stream.
  #audioSource = new Watch.Audio.Source(this.#sync, { broadcast: this.#broadcast });
  #audioMse = new Watch.Audio.Mse(this.#muxer, this.#audioSource);

  #signals = new Watch.Signals.Effect();

  constructor() {
    super();

    cleanup.register(this, this.#signals);
    this.#signals.cleanup(() => {
      this.#connection.close();
      this.#broadcast.close();
      this.#sync.close();
      this.#muxer.close();
      this.#videoSource.close();
      this.#videoMse.close();
      this.#audioSource.close();
      this.#audioMse.close();
    });

    this.#muxer.element.set(this.nativeEl as HTMLMediaElement);
  }

  get(prop: string): any {
    switch (prop) {
      case 'src':
        return this.#connection.url.peek()?.toString() ?? '';
      case 'name':
        return this.#broadcast.name.peek()?.toString() ?? '';
      case 'paused':
        return this.#muxer.paused.peek();
      case 'volume':
        return this.#audioMse.volume.peek();
      case 'muted':
        return this.#audioMse.muted.peek();
      case 'currentTime':
        return this.#videoMse.timestamp.peek() / 1000;
      case 'duration':
        return Number.POSITIVE_INFINITY;
      default:
        return super.get(prop);
    }
  }

  set(prop: string, val: any): void {
    switch (prop) {
      case 'src':
        this.#connection.url.set(val ? new URL(val) : undefined);
        break;
      case 'name':
        this.#broadcast.name.set(val ? Moq.Path.from(val) : Moq.Path.empty());
        break;
      case 'volume':
        this.#audioMse.volume.set(val);
        break;
      case 'muted':
        this.#audioMse.muted.set(val);
        break;
      default:
        super.set(prop, val);
    }
  }

  call(prop: string, ...args: any[]): any {
    switch (prop) {
      case 'play':
        this.#muxer.paused.set(false);
        return Promise.resolve();
      case 'pause':
        this.#muxer.paused.set(true);
        return;
      default:
        return super.call(prop, ...args);
    }
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName === 'src' && oldValue !== newValue) {
      this.src = newValue ?? '';
    } else if (attrName === 'name' && oldValue !== newValue) {
      this.set('name', newValue ?? '');
    } else if (attrName !== 'src' && attrName !== 'name') {
      super.attributeChangedCallback(attrName, oldValue, newValue);
    }
  }
}
