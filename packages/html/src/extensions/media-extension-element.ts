import { ContextConsumer } from '@videojs/element/context';
import {
  addMediaExtension,
  type AnyHTMLMediaAdapter,
  HTMLMediaAdapter,
  type Media,
  type MediaExtension,
} from '@videojs/media/dom';

import { mediaContext } from '../player/context';
import { UIElement } from '../ui/ui-element';

/** Resolve the media adapter from a context media value (a media custom element or the adapter itself). */
function resolveMediaAdapter(media: Media | null): AnyHTMLMediaAdapter | null {
  if (media instanceof HTMLMediaAdapter) return media;

  const adapter = (media as { adapter?: unknown } | null)?.adapter;

  return adapter instanceof HTMLMediaAdapter ? adapter : null;
}

/**
 * Abstract base for extension elements that register a media extension (e.g. Mux Data, Google Cast) with the media
 * provided by the surrounding player.
 *
 * Place inside a player, as a sibling of the media element. The component is registered when a media adapter becomes
 * available, follows the media when it changes, is removed when this element disconnects, and is destroyed with this
 * element.
 */
export abstract class MediaExtensionElement<Component extends MediaExtension> extends UIElement {
  #component: Component | null = null;
  #adapter: AnyHTMLMediaAdapter | null = null;
  #removeComponent: (() => void) | null = null;

  /**
   * Create the media extension this element registers. Called once, lazily.
   *
   * Must be a method rather than a field: upgrading an element that is already in the document runs its constructor
   * while connected, so the media context callback below can fire before subclass field initializers have run.
   */
  protected abstract createComponent(): Component;

  /** The media extension instance registered with the media adapter. */
  protected get component(): Component {
    return (this.#component ??= this.createComponent());
  }

  constructor() {
    super();
    // Registers itself as a controller on this adapter; re-requests on reconnect.
    new ContextConsumer(this, {
      context: mediaContext,
      subscribe: true,
      callback: (value) => this.#setAdapter(resolveMediaAdapter(value.media)),
    });
  }

  override disconnectedCallback(): void {
    // Remove the component while the media chain is still live so it can
    // clean up against the real underlying target.
    this.#setAdapter(null);
    super.disconnectedCallback();
  }

  override destroyCallback(): void {
    this.#setAdapter(null);
    // Don't create a component just to destroy it.
    this.#component?.destroy?.();
    super.destroyCallback();
  }

  #setAdapter(adapter: AnyHTMLMediaAdapter | null): void {
    if (this.#adapter === adapter) return;

    this.#removeComponent?.();
    this.#removeComponent = null;
    this.#adapter = adapter;

    if (adapter) this.#removeComponent = addMediaExtension(adapter, this.component);
  }
}
