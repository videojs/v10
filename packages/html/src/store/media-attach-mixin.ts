import type { Media } from '@videojs/core/dom';
import { ContextEvent } from '@videojs/element/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { AnyConstructor, Constructor } from '@videojs/utils/types';
import { type MediaContext, mediaContext } from '../player/context';

export type MediaAttachMixin = <Class extends AnyConstructor<CustomElement>>(BaseClass: Class) => Class;

/**
 * Create a mixin that registers the element as the media with the provider
 * using the context-request protocol.
 *
 * @param context - The media context to consume.
 */
export function createMediaAttachMixin(context: MediaContext): MediaAttachMixin {
  return <Class extends AnyConstructor<CustomElement>>(BaseClass: Class) => {
    class MediaAttachElement extends (BaseClass as unknown as Constructor<CustomElement>) {
      #setMedia: ((media: Media | null) => void) | null = null;
      #unsubscribe: (() => void) | null = null;

      getMediaTarget(): Media | null {
        return this as unknown as Media;
      }

      override connectedCallback() {
        super.connectedCallback?.();

        this.dispatchEvent(
          new ContextEvent(
            context,
            this,
            (value, unsubscribe) => {
              if (unsubscribe) this.#unsubscribe = unsubscribe;
              this.#setMedia = value?.setMedia ?? null;
              if (this.isConnected) {
                this.#setMedia?.(this.getMediaTarget());
              }
            },
            true
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

export const MediaAttachMixin = createMediaAttachMixin(mediaContext);
