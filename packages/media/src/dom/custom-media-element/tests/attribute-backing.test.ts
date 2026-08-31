import { describe, expect, it, vi } from 'vite-plus/test';

import { playbackCapability, sourceCapability } from '../../../core';
import { createMediaHost } from '../../media-host';
import { CustomMediaElement } from '../index';

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
});
