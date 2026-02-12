import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactiveElement } from '../reactive-element';
import type { PropertyValues, ReactiveController } from '../types';

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
    await Promise.resolve();

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
    await Promise.resolve();

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
    await Promise.resolve();

    update.mockClear();

    el.label = 'new';
    await Promise.resolve();

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
    await Promise.resolve();

    update.mockClear();

    el.label = 'hello';
    el.disabled = true;
    await Promise.resolve();

    expect(update).toHaveBeenCalledOnce();
    const changed = update.mock.calls[0]![0] as PropertyValues;
    expect(changed.has('label')).toBe(true);
    expect(changed.has('disabled')).toBe(true);
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
    await Promise.resolve();

    update.mockClear();

    el.label = 'same';
    await Promise.resolve();

    expect(update).not.toHaveBeenCalled();
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

describe('ReactiveElement updateComplete', () => {
  it('resolves to true', async () => {
    const el = createElement(ReactiveElement);
    const result = await el.updateComplete;
    expect(result).toBe(true);
  });
});

describe('ReactiveElement property inheritance', () => {
  it('inherits properties from parent class', () => {
    class Base extends ReactiveElement {
      static override properties = {
        label: { type: String },
      };
      label = '';
    }

    class Child extends Base {
      static override properties = {
        ...Base.properties,
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
  it('preserves properties set before upgrade', async () => {
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

    const tag = uniqueTag('upgrade-el');
    const el = document.createElement(tag) as TestElement;

    // Set property before defining custom element
    (el as unknown as Record<string, unknown>).label = 'pre-upgrade';
    document.body.appendChild(el);

    // Define after (upgrade scenario)
    customElements.define(tag, class extends TestElement {});

    // Wait for upgrade and first update
    await new Promise((r) => setTimeout(r, 10));

    expect(el.label).toBe('pre-upgrade');
    expect(update).toHaveBeenCalled();
  });
});
