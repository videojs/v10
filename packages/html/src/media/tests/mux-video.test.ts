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
  it('exposes the mux data component config on element config', () => {
    const el = createMuxVideo();

    expect(el.config.muxData).toBeInstanceOf(MuxData);
    expect((el.config.muxData as MuxData).playerSoftwareName).toBe('mux-video');
  });

  it('routes component config writes to the component', () => {
    const el = createMuxVideo();

    el.config = { muxData: { envKey: 'test-key' } };

    expect(el.config.muxData?.envKey).toBe('test-key');
    expect(el.hasAttribute('config')).toBe(false);
  });
});
