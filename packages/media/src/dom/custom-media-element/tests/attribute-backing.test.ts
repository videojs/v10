import { describe, expect, it, vi } from 'vite-plus/test';

import { playbackCapability, sourceCapability } from '../../../core';
import { createMediaHost, MediaHostBase } from '../../media-host';
import { CustomMediaElement, defaultCustomMediaProperties } from '../index';

/** An adapter-shaped host: its setter carries semantics, so every explicit write matters. */
class SemanticsHost extends MediaHostBase {
  #writes: boolean[] = [];
  #disableRemotePlayback = false;

  get writes() {
    return this.#writes;
  }

  get disableRemotePlayback() {
    return this.#disableRemotePlayback;
  }

  set disableRemotePlayback(value: boolean) {
    this.#writes.push(value);
    this.#disableRemotePlayback = value;
  }
}

let semanticsTagCounter = 0;

function createSemanticsElement(source?: 'host') {
  const Base = CustomMediaElement('video', SemanticsHost as never);

  class SemanticsElement extends Base {
    static override properties = {
      ...Base.properties,
      disableRemotePlayback: { type: Boolean, ...(source && { source }) },
    };
  }

  customElements.define(`test-semantics-${++semanticsTagCounter}`, SemanticsElement);
  return new SemanticsElement() as InstanceType<typeof SemanticsElement> & { host: SemanticsHost };
}

// EXPLORATION: pins the element-surface behavior for a slim composed host — which declared attributes silently
// degrade to plain reflection, and that the degradation now warns in dev.
describe('CustomMediaElement', () => {
  it('warns for each declared attribute with no backing media member on a slim host', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const SlimHost = createMediaHost([playbackCapability, sourceCapability] as const);
    const SlimElement = CustomMediaElement('video', SlimHost as never);
    void SlimElement.observedAttributes;

    const warned = warn.mock.calls.map((call) => String(call[0]));
    expect(warned.some((message) => message.includes("'loop'"))).toBe(true);
    expect(warned.some((message) => message.includes("'defaultMuted'"))).toBe(true);
    expect(warned.some((message) => message.includes("'src'"))).toBe(false);
    expect(warned.some((message) => message.includes("'preload'"))).toBe(false);

    warn.mockRestore();
  });

  it('omits members of uncomposed capabilities from the element surface entirely', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const SlimHost = createMediaHost([playbackCapability, sourceCapability] as const);
    const SlimElement = CustomMediaElement('video', SlimHost as never);
    void SlimElement.observedAttributes;

    // Not on the host and not a declared attribute: fully absent.
    expect('volume' in SlimElement.prototype).toBe(false);
    expect('currentTime' in SlimElement.prototype).toBe(false);

    // Composed member: present, forwarding.
    expect('load' in SlimElement.prototype).toBe(true);

    // Declared attribute without a backing member: still present as plain reflection — the residual gap the warning
    // makes visible.
    expect('loop' in SlimElement.prototype).toBe(true);

    warn.mockRestore();
  });

  it('pins the attribute-as-source-of-truth assumption: a write the attribute cannot represent never reaches the host', () => {
    const el = createSemanticsElement();

    // The attribute is already absent, so routing the write through `toggleAttribute` coalesces it away — the host's
    // setter, and whatever semantics it carries, never runs.
    el.disableRemotePlayback = false;
    expect(el.host.writes).toEqual([]);

    // Only a write the attribute can express gets through.
    el.disableRemotePlayback = true;
    expect(el.host.writes).toEqual([true]);
  });

  it("source: 'host' sends property writes to the host directly and keeps the attribute as an input channel", () => {
    const el = createSemanticsElement('host');

    // Every explicit write reaches the host setter, typed and un-coalesced…
    el.disableRemotePlayback = false;
    el.disableRemotePlayback = true;
    expect(el.host.writes).toEqual([false, true]);

    // …and is never written back to the attribute.
    expect(el.hasAttribute('disableremoteplayback')).toBe(false);

    // Markup remains an input: an attribute change still drives the host.
    el.setAttribute('disableremoteplayback', '');
    expect(el.host.writes).toEqual([false, true, true]);
  });

  it('pins the static-override hazard: the first subclass to be defined freezes the config for its siblings', () => {
    const Base = CustomMediaElement('video', SemanticsHost as never);

    class HostSourced extends Base {
      static override properties = {
        ...Base.properties,
        disableRemotePlayback: { type: Boolean, source: 'host' as const },
      };
    }

    class AttributeSourced extends Base {
      static override properties = { ...Base.properties };
    }

    // HostSourced touches observedAttributes first, so #define latches its config onto the shared factory prototype.
    customElements.define(`test-semantics-${++semanticsTagCounter}`, HostSourced);
    customElements.define(`test-semantics-${++semanticsTagCounter}`, AttributeSourced);

    const el = new AttributeSourced() as InstanceType<typeof AttributeSourced> & { host: SemanticsHost };

    // AttributeSourced declared the default attribute-sourced behavior, but inherits HostSourced's direct-write
    // wiring anyway: this write would be coalesced away under its own declared config.
    el.disableRemotePlayback = false;
    expect(el.host.writes).toEqual([false]);
  });

  it('injected properties are deterministic and independent per factory call', () => {
    const HostSourced = CustomMediaElement('video', SemanticsHost as never, {
      properties: {
        ...defaultCustomMediaProperties,
        disableRemotePlayback: { type: Boolean, source: 'host' },
      },
    });
    const AttributeSourced = CustomMediaElement('video', SemanticsHost as never);

    customElements.define(`test-semantics-${++semanticsTagCounter}`, HostSourced);
    customElements.define(`test-semantics-${++semanticsTagCounter}`, AttributeSourced);

    const hostSourced = new HostSourced() as InstanceType<typeof HostSourced> & { host: SemanticsHost };
    const attributeSourced = new AttributeSourced() as InstanceType<typeof AttributeSourced> & { host: SemanticsHost };

    // Each factory call closes over its own config: direct writes here…
    hostSourced.disableRemotePlayback = false;
    expect(hostSourced.host.writes).toEqual([false]);

    // …attribute-coalesced writes there, no cross-contamination.
    attributeSourced.disableRemotePlayback = false;
    expect(attributeSourced.host.writes).toEqual([]);
  });
});
