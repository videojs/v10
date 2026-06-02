import type { Media } from '@videojs/core/dom';
import { isMediaRemotePlaybackHost, selectSource } from '@videojs/core/dom';
import { GoogleCast, type GoogleCastProps, googleCastDefaultProps } from '@videojs/core/dom/media/google-cast';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { mediaContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../../ui/media-element';

export class GoogleCastElement extends MediaElement implements GoogleCastProps {
  static readonly tagName = 'media-google-cast';

  static override properties = {
    src: { type: String },
    receiver: { type: String },
    contentType: { type: String, attribute: 'content-type' },
    streamType: { type: String, attribute: 'stream-type' },
    customData: {},
  } satisfies PropertyDeclarationMap<keyof GoogleCastProps>;

  src = googleCastDefaultProps.src;
  receiver = googleCastDefaultProps.receiver;
  contentType = googleCastDefaultProps.contentType;
  streamType = googleCastDefaultProps.streamType;
  customData = googleCastDefaultProps.customData;

  #media: Media | null = null;
  #cast: GoogleCast | null = null;

  readonly #mediaContext = new ContextConsumer(this, {
    context: mediaContext,
    callback: (value) => this.#setMedia(value?.media ?? null),
    subscribe: true,
  });

  readonly #source = new PlayerController(this, playerContext, selectSource);

  connectedCallback(): void {
    super.connectedCallback();
    this.#setMedia(this.#mediaContext.value?.media ?? null);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#setMedia(null);
  }

  #setMedia(media: Media | null): void {
    if (this.#media === media) return;

    this.#detachCast();
    this.#media = media;

    if (!isMediaRemotePlaybackHost(media)) return;

    const cast = new GoogleCast(this.#props());

    if (!cast.supported) {
      cast.destroy();
      return;
    }

    this.#cast = cast;
    media.setRemoteMedia(this.#cast);
  }

  #detachCast(): void {
    if (isMediaRemotePlaybackHost(this.#media)) {
      this.#media.setRemoteMedia(null);
    }

    this.#cast?.destroy();
    this.#cast = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.#cast?.setProps(this.#props());
  }

  #props(): Partial<GoogleCastProps> {
    return {
      src: this.src || this.#source.value?.source || undefined,
      receiver: this.receiver,
      contentType: this.contentType,
      streamType: this.streamType,
      customData: this.customData,
    };
  }
}
