import { ContextConsumer } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { MediaContainer, PlayerStore, PlayerTarget } from '@videojs/core/dom';
import { listen, querySlot } from '@videojs/utils/dom';
import { Disposer } from '@videojs/utils/events';
import { noop } from '@videojs/utils/function';
import type { Constructor } from '@videojs/utils/types';

import type { PlayerContext } from '../player/context';
import type { PlayerConsumer } from './types';

type Base = Constructor<ReactiveElement>;

type Result<Class extends Base, Store extends PlayerStore> = Class & Constructor<PlayerConsumer<Store>>;

export type ContainerMixin<Store extends PlayerStore> = <Class extends Base>(BaseClass: Class) => Result<Class, Store>;

export function createContainerMixin<Store extends PlayerStore>(context: PlayerContext<Store>): ContainerMixin<Store> {
  return <Class extends Base>(BaseClass: Class) => {
    class PlayerContainerElement extends BaseClass implements PlayerConsumer<Store>, MediaContainer {
      #detach = noop;
      #disposer = new Disposer();

      #consumer = new ContextConsumer(this, {
        context,
        callback: () => this.#attachMedia(),
        subscribe: true,
      });

      get store(): Store | null {
        return (this.#consumer.value?.store as Store) ?? null;
      }

      override connectedCallback() {
        super.connectedCallback();

        if (this.shadowRoot) {
          const slot = querySlot(this.shadowRoot, '');
          if (slot) this.#disposer.add(listen(slot, 'slotchange', () => this.#attachMedia()));
        }

        this.#attachMedia();
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#disposer.dispose();
        this.#detach();
      }

      #attachMedia() {
        const ctx = this.#consumer.value;
        if (!ctx) return;

        const { store, media } = ctx;

        if (!media) return;

        const target: PlayerTarget = {
          media,
          container: this,
        };

        if (store.target?.media !== target.media || store.target?.container !== target.container) {
          this.#detach();
          this.#detach = store.attach(target);
        }
      }
    }

    return PlayerContainerElement;
  };
}
