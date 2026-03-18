import type { Media } from '@videojs/core/dom';
import { ContextEvent } from '@videojs/element/context';
import type { AnyConstructor, Constructor } from '@videojs/utils/types';
import { type MediaAttachContext, mediaAttachContext } from '../player/context';

interface CustomElementLike extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

export type MediaAttachMixin = <Class extends AnyConstructor<HTMLElement>>(BaseClass: Class) => Class;

/**
 * Create a mixin that consumes `mediaAttachContext` and registers the
 * element as the media with the provider.
 *
 * Uses the raw context-request protocol so it works with any
 * `HTMLElement` subclass — no `ReactiveControllerHost` required.
 *
 * @param context - The media attach context to consume.
 */
export function createMediaAttachMixin(context: MediaAttachContext): MediaAttachMixin {
  return <Class extends AnyConstructor<HTMLElement>>(BaseClass: Class) => {
    class MediaAttachElement extends (BaseClass as unknown as Constructor<CustomElementLike>) {
      #setMedia: ((media: Media | null) => void) | null = null;
      #unsubscribe: (() => void) | null = null;

      override connectedCallback() {
        super.connectedCallback?.();

        // Request context from an ancestor provider via the context protocol.
        this.dispatchEvent(
          new ContextEvent(
            context,
            this,
            (value, unsubscribe) => {
              if (unsubscribe) this.#unsubscribe = unsubscribe;
              this.#setMedia = value ?? null;
              if (this.isConnected) {
                this.#setMedia?.(this as unknown as Media);
              }
            },
            true // subscribe to updates
          )
        );
      }

      override disconnectedCallback() {
        super.disconnectedCallback?.();
        this.#setMedia?.(null);
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        this.#setMedia = null;
      }
    }

    return MediaAttachElement as unknown as Class;
  };
}

export const MediaAttachMixin = createMediaAttachMixin(mediaAttachContext);
