import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { MediaChildren } from '../media-children';

function createHost() {
  const host = document.createElement('div');

  host.attachShadow({ mode: 'open' });
  host.shadowRoot!.innerHTML = '<video></video><slot></slot>';
  document.body.append(host);

  const video = host.shadowRoot!.querySelector('video')!;
  const children = new MediaChildren(host, () => video);

  return { host, video, children };
}

describe('MediaChildren', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clones track and source children into the target and leaves other children alone', () => {
    const { host, video, children } = createHost();

    host.innerHTML = '<track kind="captions" src="en.vtt" /><source src="a.mp4" /><span>label</span>';
    children.sync();

    expect(video.querySelector('track')?.getAttribute('src')).toBe('en.vtt');
    expect(video.querySelector('source')?.getAttribute('src')).toBe('a.mp4');
    expect(video.querySelector('span')).toBeNull();
    expect(host.querySelector('track')).not.toBe(video.querySelector('track'));
  });

  it('removes a clone when its child leaves', () => {
    const { host, video, children } = createHost();

    host.innerHTML = '<source src="a.mp4" /><source src="b.mp4" />';
    children.sync();
    host.querySelector('source')!.remove();
    children.sync();

    expect([...video.querySelectorAll('source')].map((el) => el.getAttribute('src'))).toEqual(['b.mp4']);
  });

  it('mirrors attribute changes from a child to its clone', async () => {
    const { host, video, children } = createHost();

    host.innerHTML = '<source src="a.mp4" />';
    children.sync();
    host.querySelector('source')!.setAttribute('src', 'c.mp4');
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    expect(video.querySelector('source')?.getAttribute('src')).toBe('c.mp4');
  });

  it('removes an attribute from the clone when it leaves the child', async () => {
    const { host, video, children } = createHost();

    host.innerHTML = '<track kind="chapters" default src="chapters.vtt" />';
    children.sync();
    host.querySelector('track')!.removeAttribute('default');
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    expect(video.querySelector('track')!.hasAttribute('default')).toBe(false);
  });

  it('stops following the children once disconnected', async () => {
    const { host, video, children } = createHost();

    host.innerHTML = '<source src="a.mp4" />';
    children.sync();
    children.disconnect();
    host.querySelector('source')!.setAttribute('src', 'c.mp4');
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    expect(video.querySelector('source')?.getAttribute('src')).toBe('a.mp4');
  });

  it('enables a default chapters track that the browser left disabled', () => {
    const { host, video, children } = createHost();
    const textTrack = { mode: 'disabled' };

    // jsdom has no `TextTrack`; the clone inherits the stub through the prototype.
    Object.defineProperty(HTMLTrackElement.prototype, 'track', { configurable: true, get: () => textTrack });
    host.innerHTML = '<track kind="chapters" default src="chapters.vtt" />';
    children.sync();
    delete (HTMLTrackElement.prototype as { track?: unknown }).track;

    expect(video.querySelector('track')!.hasAttribute('default')).toBe(true);
    expect(textTrack.mode).toBe('hidden');
  });
});
