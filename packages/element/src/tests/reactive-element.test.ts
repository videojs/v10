import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { ReactiveElement } from '../reactive-element';
import type { PropertyDeclarations, PropertyValues, ReactiveController } from '../types';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<T extends HTMLElement>(ctor: { new (): T }): T {
  const tag = uniqueTag('test-el');

  if (!customElements.get(tag)) {
    customElements.define(tag, class extends (ctor as typeof HTMLElement) {} as typeof HTMLElement);
  }

  return document.createElement(tag) as T;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ReactiveElement', () => {
  it('extends HTMLElement', () => {
    const el = createElement(ReactiveElement);

    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('calls connectedCallback and disconnectedCallback', () => {
    const connected = vi.fn();
    const disconnected = vi.fn();

    class TestElement extends ReactiveElement {
      override connectedCallback() {
        super.connectedCallback();
        connected();
      }
      override disconnectedCallback() {
        super.disconnectedCallback();
        disconnected();
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    expect(connected).toHaveBeenCalledOnce();

    el.remove();
    expect(disconnected).toHaveBeenCalledOnce();
  });

  it('runs willUpdate and update on first connect', async () => {
    const willUpdate = vi.fn();
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      protected override willUpdate(changed: PropertyValues) {
        super.willUpdate(changed);
        willUpdate(changed);
      }
      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(changed);
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(willUpdate).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('does not run update before connect', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      protected override update() {
        update();
      }
    }

    createElement(TestElement);

    // Flush multiple microtasks — update should never fire without connect
    await new Promise((r) => setTimeout(r, 10));

    expect(update).not.toHaveBeenCalled();
  });
});

describe('ReactiveElement properties', () => {
  it('reflects string attribute to property', () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = 'default';
    }

    const el = createElement(TestElement);

    el.setAttribute('label', 'hello');
    expect(el.label).toBe('hello');
  });

  it('reflects boolean attribute to property', () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        disabled: { type: Boolean },
      };
      disabled = false;
    }

    const el = createElement(TestElement);

    el.setAttribute('disabled', '');
    expect(el.disabled).toBe(true);

    el.removeAttribute('disabled');
    expect(el.disabled).toBe(false);
  });

  it('coerces number attribute to property', () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        count: { type: Number },
      };
      count = 0;
    }

    const el = createElement(TestElement);

    el.setAttribute('count', '42');
    expect(el.count).toBe(42);
    expect(typeof el.count).toBe('number');

    el.setAttribute('count', '3.14');
    expect(el.count).toBe(3.14);

    el.setAttribute('count', 'not-a-number');
    expect(el.count).toBeNaN();
  });

  it('supports custom attribute names', () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        negativeSign: { type: String, attribute: 'negative-sign' },
      };
      negativeSign = '-';
    }

    const el = createElement(TestElement);

    el.setAttribute('negative-sign', '\u2212');
    expect(el.negativeSign).toBe('\u2212');
  });

  it('lowercases an implicit attribute name', () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        closeDelay: { type: Number },
      };
      closeDelay = 0;
    }

    const el = createElement(TestElement);

    expect(TestElement.observedAttributes).toContain('closedelay');
    el.setAttribute('closedelay', '100');
    expect(el.closeDelay).toBe(100);
  });

  it('triggers requestUpdate on property change', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = 'default';

      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(changed);
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    update.mockClear();

    el.label = 'new';
    await el.updateComplete;

    expect(update).toHaveBeenCalledOnce();
    const changed = update.mock.calls[0]![0] as PropertyValues;

    expect(changed.get('label')).toBe('default');
  });

  it('batches multiple property changes into single update', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
        disabled: { type: Boolean },
      };
      label = '';
      disabled = false;

      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(changed);
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    update.mockClear();

    el.label = 'hello';
    el.disabled = true;
    await el.updateComplete;

    expect(update).toHaveBeenCalledOnce();
    const changed = update.mock.calls[0]![0] as PropertyValues;

    expect(changed.has('label')).toBe(true);
    expect(changed.has('disabled')).toBe(true);
  });

  it('preserves the first old value when batching changes to the same property', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = 'default';

      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(changed);
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    update.mockClear();

    el.label = 'first';
    el.label = 'second';
    await el.updateComplete;

    expect(update).toHaveBeenCalledOnce();
    const changed = update.mock.calls[0]![0] as PropertyValues;

    expect(el.label).toBe('second');
    expect(changed.get('label')).toBe('default');
  });

  it('does not trigger update when value is unchanged', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = 'same';

      protected override update() {
        update();
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    update.mockClear();

    el.label = 'same';

    // Flush multiple microtasks — update should not fire
    await new Promise((r) => setTimeout(r, 10));

    expect(update).not.toHaveBeenCalled();
  });

  it('uses a custom hasChanged predicate', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        count: { type: Number, hasChanged: (value: number, oldValue: number) => value > oldValue },
      };
      count = 0;

      protected override update() {
        update();
      }
    }

    const el = createElement(TestElement);

    document.body.append(el);
    await el.updateComplete;
    update.mockClear();

    el.count = -1;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(update).not.toHaveBeenCalled();

    el.count = 1;
    await el.updateComplete;
    expect(update).toHaveBeenCalledOnce();
  });

  it('supports a converter function with a type hint', () => {
    const converter = vi.fn((value: string | null, type?: unknown) => `${String(type)}:${value}`);

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: 'label', converter },
      };
      label = '';
    }

    const el = createElement(TestElement);

    el.setAttribute('label', 'Player');

    expect(el.label).toBe('label:Player');
    expect(converter).toHaveBeenCalledWith('Player', 'label');
  });

  it('does not create an accessor for noAccessor properties', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String, noAccessor: true },
      };
      label = 'default';

      protected override update() {
        update();
      }
    }

    const el = createElement(TestElement);

    document.body.append(el);
    await el.updateComplete;
    update.mockClear();

    el.label = 'changed';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(update).not.toHaveBeenCalled();
    expect(Object.getOwnPropertyDescriptor(TestElement.prototype, 'label')).toBeUndefined();
  });

  it('wraps an existing accessor and records its initial value', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      #label = 'default';

      get label() {
        return this.#label;
      }

      set label(value: string) {
        this.#label = value.toUpperCase();
      }

      protected override update(changed: PropertyValues) {
        update(new Map(changed));
      }
    }

    const el = createElement(TestElement);

    document.body.append(el);
    await el.updateComplete;

    expect(update.mock.calls[0]![0]).toEqual(new Map([['label', undefined]]));

    update.mockClear();
    el.label = 'player';
    await el.updateComplete;

    expect(el.label).toBe('PLAYER');
    expect(update.mock.calls[0]![0]).toEqual(new Map([['label', 'default']]));
  });
});

describe('ReactiveElement controllers', () => {
  it('dispatches hostConnected on connect', () => {
    const controller: ReactiveController = {
      hostConnected: vi.fn(),
      hostDisconnected: vi.fn(),
    };

    const el = createElement(ReactiveElement);

    el.addController(controller);

    document.body.appendChild(el);
    expect(controller.hostConnected).toHaveBeenCalledOnce();
  });

  it('dispatches hostDisconnected on disconnect', () => {
    const controller: ReactiveController = {
      hostConnected: vi.fn(),
      hostDisconnected: vi.fn(),
    };

    const el = createElement(ReactiveElement);

    el.addController(controller);

    document.body.appendChild(el);
    el.remove();
    expect(controller.hostDisconnected).toHaveBeenCalledOnce();
  });

  it('dispatches hostConnected immediately if already connected', () => {
    const controller: ReactiveController = {
      hostConnected: vi.fn(),
    };

    const el = createElement(ReactiveElement);

    document.body.appendChild(el);

    el.addController(controller);
    expect(controller.hostConnected).toHaveBeenCalledOnce();
  });

  it('does not notify a controller twice when a connected element upgrades', () => {
    const hostConnected = vi.fn();

    class TestElement extends ReactiveElement {
      constructor() {
        super();
        this.addController({ hostConnected });
      }
    }

    const tag = uniqueTag('upgrade-controller-el');
    const container = document.createElement('div');

    container.innerHTML = `<${tag}></${tag}>`;
    document.body.append(container);
    customElements.define(tag, TestElement);

    expect(hostConnected).toHaveBeenCalledOnce();
  });

  it('removes controller', () => {
    const controller: ReactiveController = {
      hostDisconnected: vi.fn(),
    };

    const el = createElement(ReactiveElement);

    el.addController(controller);
    el.removeController(controller);

    document.body.appendChild(el);
    el.remove();
    expect(controller.hostDisconnected).not.toHaveBeenCalled();
  });

  it('dispatches to multiple controllers', () => {
    const c1: ReactiveController = { hostConnected: vi.fn() };
    const c2: ReactiveController = { hostConnected: vi.fn() };

    const el = createElement(ReactiveElement);

    el.addController(c1);
    el.addController(c2);

    document.body.appendChild(el);
    expect(c1.hostConnected).toHaveBeenCalledOnce();
    expect(c2.hostConnected).toHaveBeenCalledOnce();
  });
});

describe('ReactiveElement lifecycle', () => {
  it('calls firstUpdated only once on first update', async () => {
    const firstUpdated = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';

      protected override firstUpdated(changed: PropertyValues) {
        firstUpdated(new Map(changed));
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(firstUpdated).toHaveBeenCalledOnce();

    // Second update should not call firstUpdated again
    firstUpdated.mockClear();
    el.label = 'new';
    await el.updateComplete;

    expect(firstUpdated).not.toHaveBeenCalled();
  });

  it('calls updated after every update', async () => {
    const updated = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';

      protected override updated(changed: PropertyValues) {
        updated(new Map(changed));
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(updated).toHaveBeenCalledOnce();

    // Should fire on subsequent updates too
    updated.mockClear();
    el.label = 'new';
    await el.updateComplete;

    expect(updated).toHaveBeenCalledOnce();
    const changed = updated.mock.calls[0]![0] as PropertyValues;

    expect(changed.get('label')).toBe('');
  });

  it('calls lifecycle methods in correct order (matches Lit)', async () => {
    const calls: string[] = [];

    const controller: ReactiveController = {
      hostUpdate: () => calls.push('hostUpdate'),
      hostUpdated: () => calls.push('hostUpdated'),
    };

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';

      constructor() {
        super();
        this.addController(controller);
      }

      protected override willUpdate(_changed: PropertyValues) {
        calls.push('willUpdate');
      }
      protected override update(_changed: PropertyValues) {
        calls.push('update');
      }
      protected override firstUpdated(_changed: PropertyValues) {
        calls.push('firstUpdated');
      }
      protected override updated(_changed: PropertyValues) {
        calls.push('updated');
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    // Lit order: willUpdate → hostUpdate → update → hostUpdated → firstUpdated → updated
    expect(calls).toEqual(['willUpdate', 'hostUpdate', 'update', 'hostUpdated', 'firstUpdated', 'updated']);

    // Second update — no firstUpdated
    calls.length = 0;
    el.label = 'new';
    await el.updateComplete;

    expect(calls).toEqual(['willUpdate', 'hostUpdate', 'update', 'hostUpdated', 'updated']);
  });

  it('sets hasUpdated to true after first update', async () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';
    }

    const el = createElement(TestElement);

    expect(el.hasUpdated).toBe(false);

    document.body.appendChild(el);
    expect(el.hasUpdated).toBe(false);

    await el.updateComplete;
    expect(el.hasUpdated).toBe(true);
  });

  it('hasUpdated is true inside firstUpdated and updated (matches Lit)', async () => {
    let hasUpdatedDuringFirstUpdated: boolean | undefined;
    let hasUpdatedDuringUpdated: boolean | undefined;

    class TestElement extends ReactiveElement {
      protected override firstUpdated(_changed: PropertyValues) {
        hasUpdatedDuringFirstUpdated = this.hasUpdated;
      }
      protected override updated(_changed: PropertyValues) {
        hasUpdatedDuringUpdated = this.hasUpdated;
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    // Matches Lit: hasUpdated is set before firstUpdated and updated
    expect(hasUpdatedDuringFirstUpdated).toBe(true);
    expect(hasUpdatedDuringUpdated).toBe(true);
    expect(el.hasUpdated).toBe(true);
  });
});

describe('ReactiveElement isUpdatePending', () => {
  it('is true after requestUpdate, false after update completes', async () => {
    const el = createElement(ReactiveElement);

    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.isUpdatePending).toBe(false);

    el.requestUpdate();
    expect(el.isUpdatePending).toBe(true);

    await el.updateComplete;
    expect(el.isUpdatePending).toBe(false);
  });

  it('is true during update cycle', async () => {
    let pendingDuringUpdate: boolean | undefined;
    let pendingDuringUpdated: boolean | undefined;

    class TestElement extends ReactiveElement {
      protected override update(_changed: PropertyValues) {
        pendingDuringUpdate = this.isUpdatePending;
      }
      protected override updated(_changed: PropertyValues) {
        pendingDuringUpdated = this.isUpdatePending;
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    // isUpdatePending is true during update, false during updated
    // (matches Lit: __markUpdated runs after update, before _$didUpdate)
    expect(pendingDuringUpdate).toBe(true);
    expect(pendingDuringUpdated).toBe(false);
  });
});

describe('ReactiveElement performUpdate', () => {
  it('flushes a pending update synchronously', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';

      override performUpdate() {
        super.performUpdate();
      }

      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(changed);
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;
    update.mockClear();

    el.label = 'sync';
    expect(el.isUpdatePending).toBe(true);

    // Flush synchronously
    el.performUpdate();
    expect(update).toHaveBeenCalledOnce();
    expect(el.isUpdatePending).toBe(false);
  });

  it('is a no-op when no update is pending', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      override performUpdate() {
        super.performUpdate();
      }

      protected override update() {
        update();
      }
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;
    update.mockClear();

    el.performUpdate();
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts another update after an update throws', async () => {
    class TestElement extends ReactiveElement {
      shouldThrow = false;

      override performUpdate() {
        super.performUpdate();
      }

      protected override update() {
        if (this.shouldThrow) throw new Error('update failed');
      }
    }

    const el = createElement(TestElement);

    document.body.append(el);
    await el.updateComplete;

    el.shouldThrow = true;
    el.requestUpdate();

    expect(() => el.performUpdate()).toThrow('update failed');
    expect(el.isUpdatePending).toBe(false);

    el.shouldThrow = false;
    await el.updateComplete;
    el.requestUpdate();
    await expect(el.updateComplete).resolves.toBe(true);
  });
});

describe('ReactiveElement updateComplete', () => {
  it('resolves after first update when connected', async () => {
    const el = createElement(ReactiveElement);

    document.body.appendChild(el);

    const result = await el.updateComplete;

    expect(result).toBe(true);
    expect(el.hasUpdated).toBe(true);
  });

  it('resolves after property-triggered update', async () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';
    }

    const el = createElement(TestElement);

    document.body.appendChild(el);
    await el.updateComplete;

    el.label = 'changed';
    const result = await el.updateComplete;

    expect(result).toBe(true);
  });
});

describe('ReactiveElement property inheritance', () => {
  it('inherits properties from parent class without redeclaring them', () => {
    class Base extends ReactiveElement {
      static override properties: PropertyDeclarations = {
        label: { type: String },
      };
      label = '';
    }

    class Child extends Base {
      static override properties = {
        disabled: { type: Boolean },
      };
      disabled = false;
    }

    const el = createElement(Child);

    el.setAttribute('label', 'test');
    expect(el.label).toBe('test');

    el.setAttribute('disabled', '');
    expect(el.disabled).toBe(true);
  });
});

describe('ReactiveElement upgrade', () => {
  it('does not overwrite properties set after connection but before the first update', async () => {
    const update = vi.fn();

    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = 'default';

      protected override update(changed: PropertyValues) {
        super.update(changed);
        update(this.label);
      }
    }

    const tag = uniqueTag('connect-el');

    customElements.define(tag, TestElement);

    // SAFETY: The tag was registered with TestElement immediately above.
    const el = document.createElement(tag) as TestElement;

    document.body.appendChild(el);
    el.label = 'newer';
    await el.updateComplete;

    expect(el.label).toBe('newer');
    expect(update).toHaveBeenLastCalledWith('newer');

    update.mockClear();
    el.label = 'later';
    await el.updateComplete;

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith('later');
  });

  it('reports reactive accessors shadowed by native class fields', async () => {
    class TestElement extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      declare label: string;

      constructor() {
        super();

        // Native class fields use DefineField semantics rather than invoking a prototype setter.
        Object.defineProperty(this, 'label', {
          value: 'default',
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    const tag = uniqueTag('upgrade-class-field-el');

    customElements.define(tag, TestElement);

    // SAFETY: The tag was registered with TestElement immediately above.
    const el = document.createElement(tag) as TestElement;

    document.body.appendChild(el);

    await expect(el.updateComplete).rejects.toThrow('Reactive properties on');
    expect(Object.hasOwn(el, 'label')).toBe(true);
  });
});
