import type { PlayerTarget } from '@videojs/core/dom';
import { ReactiveElement } from '@videojs/element';
import { ContextProvider, createContext } from '@videojs/element/context';
import { createStore, defineSlice, flush, type Store } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PLAYER_CONTEXT_KEY, type PlayerContext } from '../context';
import { PlayerController } from '../player-controller';

interface TestState {
  count: number;
  setCount: (count: number) => void;
}

type TestStore = Store<PlayerTarget, TestState>;

const testSlice = defineSlice<PlayerTarget>()({
  name: 'playerControllerTest',
  state: ({ set }): TestState => ({
    count: 0,
    setCount: (count) => set({ count }),
  }),
});

let tagCounter = 0;

function createTestStore(count: number): TestStore {
  const store = createStore<PlayerTarget>()(testSlice);
  store.setCount(count);
  flush();
  return store;
}

function defineTestElement(elementClass: CustomElementConstructor): string {
  const tagName = `test-player-controller-${tagCounter++}`;
  customElements.define(tagName, elementClass);
  return tagName;
}

function trackSubscriptions(store: TestStore) {
  const originalSubscribe = store.$state.subscribe.bind(store.$state);
  let active = 0;
  let notifications = 0;

  vi.spyOn(store.$state, 'subscribe').mockImplementation((callback, options) => {
    active++;
    let subscribed = true;
    const unsubscribe = originalSubscribe(() => {
      notifications++;
      callback();
    }, options);

    return () => {
      if (!subscribed) return;
      subscribed = false;
      active--;
      unsubscribe();
    };
  });

  return {
    active: () => active,
    notifications: () => notifications,
  };
}

function createElements(initialStore: TestStore) {
  const context = createContext<TestStore, typeof PLAYER_CONTEXT_KEY>(PLAYER_CONTEXT_KEY) as PlayerContext<TestStore>;

  class ProviderElement extends ReactiveElement {
    readonly #provider = new ContextProvider(this, { context, initialValue: initialStore });

    setStore(store: TestStore): void {
      this.#provider.setValue(store);
    }
  }

  class ConsumerElement extends ReactiveElement {
    readonly count = new PlayerController<TestStore, number>(this, context, (state) => state.count);
  }

  const provider = document.createElement(defineTestElement(ProviderElement)) as ProviderElement;
  const consumer = document.createElement(defineTestElement(ConsumerElement)) as ConsumerElement;
  provider.append(consumer);

  return { consumer, provider };
}

describe('PlayerController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('retargets a selected subscription when the live provider value changes', () => {
    const storeA = createTestStore(1);
    const storeB = createTestStore(10);
    const subscriptionsA = trackSubscriptions(storeA);
    const subscriptionsB = trackSubscriptions(storeB);
    const { consumer, provider } = createElements(storeA);
    document.body.append(provider);

    expect(consumer.count.value).toBe(1);
    expect(subscriptionsA.active()).toBe(1);
    expect(subscriptionsB.active()).toBe(0);

    provider.setStore(storeB);

    expect(consumer.count.value).toBe(10);
    expect(subscriptionsA.active()).toBe(0);
    expect(subscriptionsB.active()).toBe(1);

    storeA.setCount(2);
    flush();
    expect(consumer.count.value).toBe(10);

    storeB.setCount(20);
    flush();
    expect(consumer.count.value).toBe(20);
  });

  it('stops tracking when the provider value becomes unavailable', () => {
    const store = createTestStore(1);
    const subscriptions = trackSubscriptions(store);
    const { consumer, provider } = createElements(store);
    document.body.append(provider);

    provider.setStore(undefined as unknown as TestStore);

    expect(consumer.count.value).toBeUndefined();
    expect(subscriptions.active()).toBe(0);

    provider.setStore(store);

    expect(consumer.count.value).toBe(1);
    expect(subscriptions.active()).toBe(1);
  });

  it('keeps one effective subscription across repeated disconnects and reconnects', () => {
    const store = createTestStore(1);
    const subscriptions = trackSubscriptions(store);
    const { consumer, provider } = createElements(store);
    document.body.append(provider);

    expect(subscriptions.active()).toBe(1);

    for (let i = 0; i < 3; i++) {
      consumer.remove();
      expect(subscriptions.active()).toBe(0);

      provider.append(consumer);
      expect(subscriptions.active()).toBe(1);
    }

    const notifications = subscriptions.notifications();
    store.setCount(2);
    flush();

    expect(subscriptions.notifications()).toBe(notifications + 1);
    expect(consumer.count.value).toBe(2);
  });
});
