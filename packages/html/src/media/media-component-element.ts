import { ContextConsumer } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';
import {
  addMediaComponent,
  HTMLMediaElementHost,
  type HTMLMediaTargetLike,
  type MediaComponent,
} from '@videojs/media/dom/media-host';

import { mediaContext } from '../player/context';
import { MediaElement } from '../ui/media-element';

type MediaHost = HTMLMediaElementHost<HTMLMediaTargetLike, any>;

/** Resolve the media host from a context media value (a media custom element or the host itself). */
function resolveMediaHost(media: Media | null): MediaHost | null {
  if (media instanceof HTMLMediaElementHost) return media;
  const host = (media as { host?: unknown } | null)?.host;
  return host instanceof HTMLMediaElementHost ? host : null;
}

/**
 * Abstract base for elements that register a media component (e.g. Mux Data,
 * Google Cast) with the media provided by the surrounding player.
 *
 * Place inside a player, as a sibling of the media element. The component is
 * registered when a media host becomes available, follows the media when it
 * changes, is removed when this element disconnects, and is destroyed with
 * this element.
 */
export abstract class MediaComponentElement<Component extends MediaComponent> extends MediaElement {
  #component: Component | null = null;
  #host: MediaHost | null = null;
  #removeComponent: (() => void) | null = null;

  /**
   * Create the media component this element registers. Called once, lazily.
   *
   * Must be a method rather than a field: upgrading an element that is already
   * in the document runs its constructor while connected, so the media context
   * callback below can fire before subclass field initializers have run.
   */
  protected abstract createComponent(): Component;

  /** The media component instance registered with the media host. */
  protected get component(): Component {
    return (this.#component ??= this.createComponent());
  }

  constructor() {
    super();
    // Registers itself as a controller on this host; re-requests on reconnect.
    new ContextConsumer(this, {
      context: mediaContext,
      subscribe: true,
      callback: (value) => this.#setHost(resolveMediaHost(value.media)),
    });
  }

  override disconnectedCallback(): void {
    // Remove the component while the media chain is still live so it can
    // clean up against the real underlying target.
    this.#setHost(null);
    super.disconnectedCallback();
  }

  override destroyCallback(): void {
    this.#setHost(null);
    // Don't create a component just to destroy it.
    this.#component?.destroy?.();
    super.destroyCallback();
  }

  #setHost(host: MediaHost | null): void {
    if (this.#host === host) return;

    this.#removeComponent?.();
    this.#removeComponent = null;
    this.#host = host;

    if (host) this.#removeComponent = addMediaComponent(host, this.component);
  }
}
