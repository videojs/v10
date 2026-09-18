import { describe, expect, it } from 'vite-plus/test';

import { CustomMediaElement } from '../custom-media-element';
import { HTMLVideoAdapter } from '../html-video-adapter';
import { getMediaAdapter, getMediaElement } from '../utils/media-target';

class TestVideoAdapter extends HTMLVideoAdapter {}

customElements.define('test-media-target-video', CustomMediaElement('video', TestVideoAdapter));

describe('getMediaAdapter', () => {
  it('returns an adapter as is', () => {
    const adapter = new TestVideoAdapter();

    expect(getMediaAdapter(adapter)).toBe(adapter);
  });

  it('resolves the adapter a custom media element fronts', () => {
    const element = document.createElement('test-media-target-video') as HTMLElement & { adapter: TestVideoAdapter };

    expect(getMediaAdapter(element)).toBe(element.adapter);
  });

  it('returns null for a native element or an unrelated value', () => {
    expect(getMediaAdapter(document.createElement('video'))).toBeNull();
    expect(getMediaAdapter({ adapter: {} })).toBeNull();
    expect(getMediaAdapter(null)).toBeNull();
  });
});

describe('getMediaElement', () => {
  it('returns a native element as is', () => {
    const video = document.createElement('video');

    expect(getMediaElement(video)).toBe(video);
  });

  it('resolves the element a custom media element renders', () => {
    const element = document.createElement('test-media-target-video');

    expect(getMediaElement(element)).toBe(element.shadowRoot?.querySelector('video'));
  });

  it('resolves the element an adapter is attached to', () => {
    const adapter = new TestVideoAdapter();
    const video = document.createElement('video');

    expect(getMediaElement(adapter)).toBeNull();

    adapter.attach(video);

    expect(getMediaElement(adapter)).toBe(video);
  });

  it('returns null for media without a native element behind it', () => {
    expect(getMediaElement(new EventTarget())).toBeNull();
    expect(getMediaElement(null)).toBeNull();
  });
});
