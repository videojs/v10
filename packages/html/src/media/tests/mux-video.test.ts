import { getComponents } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import { afterEach, describe, expect, it } from 'vitest';
import { MuxVideo } from '../mux-video';

customElements.define('test-mux-video', MuxVideo);

function createMuxVideo() {
  const el = new MuxVideo();
  // Prevent the real Mux SDK from initializing (and beaconing) in tests.
  el.config = { muxData: { MuxDataSdk: undefined } };
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MuxVideo', () => {
  it('constructs the mux data component with the player software name', () => {
    const el = createMuxVideo();
    const muxData = getComponents(el.host).get(MuxData);

    expect(muxData).toBeInstanceOf(MuxData);
    expect(muxData?.playerSoftwareName).toBe('mux-video');
  });

  it('exposes the element config as plain values, not the component instance', () => {
    const el = createMuxVideo();

    // `config` reflects exactly what was set — a plain namespace bag.
    expect(el.config.muxData).toEqual({ MuxDataSdk: undefined });
    expect(el.config.muxData).not.toBeInstanceOf(MuxData);
  });

  it('routes component config writes to the component', () => {
    const el = createMuxVideo();
    const muxData = getComponents(el.host).get(MuxData);

    el.config = { muxData: { envKey: 'test-key' } };

    // The write reached the live component...
    expect(muxData?.envKey).toBe('test-key');
    // ...and config reads back the plain value, not the instance.
    expect(el.config.muxData?.envKey).toBe('test-key');
    expect(el.hasAttribute('config')).toBe(false);
  });
});
