import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { Store } from '../core/store';
import type { StoreContext } from './context';

import { createContext } from '@lit/context';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSlice } from '../core/slice';
import { createStore } from '../core/store';
import { createStoreControllers } from './factory';

// ----------------------------------------
// Mock Host (extends HTMLElement for context)
// ----------------------------------------

class MockHostElement extends HTMLElement implements ReactiveControllerHost {
  controllers: ReactiveController[] = [];
  updateCount = 0;

  addController(controller: ReactiveController): void {
    this.controllers.push(controller);
  }

  removeController(controller: ReactiveController): void {
    const index = this.controllers.indexOf(controller);
    if (index >= 0) {
      this.controllers.splice(index, 1);
    }
  }

  requestUpdate(): void {
    this.updateCount++;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  connect(): void {
    for (const controller of this.controllers) {
      controller.hostConnected?.();
    }
  }

  disconnect(): void {
    for (const controller of this.controllers) {
      controller.hostDisconnected?.();
    }
  }
}

// Register the custom element
customElements.define('mock-host', MockHostElement);

// ----------------------------------------
// Mock Target & Slice
// ----------------------------------------

class MockTarget extends EventTarget {
  count = 0;
  enabled = true;
}

const counterSlice = createSlice<MockTarget>()({
  initialState: { count: 0, enabled: true },
  getSnapshot: ({ target }) => ({
    count: target.count,
    enabled: target.enabled,
  }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('change', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('change', handler);
    });
  },
  request: {
    increment: (_: void, { target }) => {
      target.count++;
      target.dispatchEvent(new Event('change'));
    },
  },
});

// Type aliases
type TestSlices = [typeof counterSlice];
type TestStore = Store<MockTarget, TestSlices>;
interface TestState {
  count: number;
  enabled: boolean;
}

// Helper to create typed context and controllers
function createTestControllers(key: symbol = Symbol('test-store')) {
  const context = createContext<TestStore>(key) as StoreContext<TestStore>;
  return createStoreControllers<TestState>(context);
}

// ----------------------------------------
// Tests
// ----------------------------------------

describe('createStoreControllers', () => {
  it('creates typed controllers bound to a context', () => {
    const controllers = createTestControllers();

    expect(controllers.context).toBeDefined();
    expect(controllers.Provider).toBeDefined();
    expect(controllers.Consumer).toBeDefined();
    expect(controllers.StoreController).toBeDefined();
    expect(controllers.SliceController).toBeDefined();
    expect(controllers.PendingController).toBeDefined();
  });
});

describe('provider', () => {
  let host: MockHostElement;
  let store: TestStore;

  beforeEach(() => {
    host = document.createElement('mock-host') as MockHostElement;
    store = createStore({ slices: [counterSlice] });
  });

  afterEach(() => {
    store.destroy();
  });

  it('registers controller with the host', () => {
    const { Provider } = createTestControllers();
    const _provider = new Provider(host, store);

    expect(host.controllers.length).toBe(1);
  });

  it('exposes the store via value getter', () => {
    const { Provider } = createTestControllers();
    const provider = new Provider(host, store);

    expect(provider.value).toBe(store);
  });
});

describe('consumer', () => {
  let providerHost: MockHostElement;
  let consumerHost: MockHostElement;
  let store: TestStore;

  beforeEach(() => {
    providerHost = document.createElement('mock-host') as MockHostElement;
    consumerHost = document.createElement('mock-host') as MockHostElement;
    store = createStore({ slices: [counterSlice] });

    // Set up DOM hierarchy
    providerHost.appendChild(consumerHost);
    document.body.appendChild(providerHost);
  });

  afterEach(() => {
    store.destroy();
    document.body.removeChild(providerHost);
  });

  it('registers controller with the host', () => {
    const { Consumer } = createTestControllers();
    const _consumer = new Consumer(consumerHost);

    expect(consumerHost.controllers.length).toBe(1);
  });

  it('value is undefined before connecting', () => {
    const { Consumer } = createTestControllers();
    const consumer = new Consumer(consumerHost);

    expect(consumer.value).toBeUndefined();
  });

  it('receives store from provider on connect', () => {
    const { Provider, Consumer } = createTestControllers();

    const _provider = new Provider(providerHost, store);
    providerHost.connect();

    const consumer = new Consumer(consumerHost);
    consumerHost.connect();

    expect(consumer.value).toBe(store);
  });

  it('updates host when store is received', () => {
    const { Provider, Consumer } = createTestControllers();

    const _provider = new Provider(providerHost, store);
    providerHost.connect();

    const _consumer = new Consumer(consumerHost);
    const initialCount = consumerHost.updateCount;
    consumerHost.connect();

    expect(consumerHost.updateCount).toBeGreaterThan(initialCount);
  });
});

describe('provider/consumer integration', () => {
  it('different contexts do not interfere', () => {
    const providerHost = document.createElement('mock-host') as MockHostElement;
    const consumerHost = document.createElement('mock-host') as MockHostElement;

    providerHost.appendChild(consumerHost);
    document.body.appendChild(providerHost);

    const store1 = createStore<TestSlices>({ slices: [counterSlice] });

    const { Provider } = createTestControllers(Symbol('context-1'));
    const { Consumer } = createTestControllers(Symbol('context-2'));

    // Provider for context1
    const _provider = new Provider(providerHost, store1);
    providerHost.connect();

    // Consumer for context2 (should not receive store1)
    const consumer = new Consumer(consumerHost);
    consumerHost.connect();

    expect(consumer.value).toBeUndefined();

    // Cleanup
    store1.destroy();
    document.body.removeChild(providerHost);
  });

  it('consumer receives closest provider value', () => {
    const outerHost = document.createElement('mock-host') as MockHostElement;
    const innerHost = document.createElement('mock-host') as MockHostElement;
    const consumerHost = document.createElement('mock-host') as MockHostElement;

    outerHost.appendChild(innerHost);
    innerHost.appendChild(consumerHost);
    document.body.appendChild(outerHost);

    const outerStore = createStore<TestSlices>({ slices: [counterSlice] });
    const innerStore = createStore<TestSlices>({ slices: [counterSlice] });

    const { Provider, Consumer } = createTestControllers(Symbol('shared'));

    // Both providers for same context
    const _outerProvider = new Provider(outerHost, outerStore);
    const _innerProvider = new Provider(innerHost, innerStore);
    outerHost.connect();
    innerHost.connect();

    // Consumer should get inner store (closest provider)
    const consumer = new Consumer(consumerHost);
    consumerHost.connect();

    expect(consumer.value).toBe(innerStore);

    // Cleanup
    outerStore.destroy();
    innerStore.destroy();
    document.body.removeChild(outerHost);
  });

  it('consumer receives updated value when provider changes it', () => {
    const providerHost = document.createElement('mock-host') as MockHostElement;
    const consumerHost = document.createElement('mock-host') as MockHostElement;

    providerHost.appendChild(consumerHost);
    document.body.appendChild(providerHost);

    const store1 = createStore<TestSlices>({ slices: [counterSlice] });
    const store2 = createStore<TestSlices>({ slices: [counterSlice] });

    const { Provider, Consumer } = createTestControllers(Symbol('update-test'));

    const provider = new Provider(providerHost, store1);
    const consumer = new Consumer(consumerHost);

    providerHost.connect();
    consumerHost.connect();

    expect(consumer.value).toBe(store1);

    // Update the provided value
    provider.setValue(store2);

    expect(consumer.value).toBe(store2);

    // Cleanup
    store1.destroy();
    store2.destroy();
    document.body.removeChild(providerHost);
  });
});
