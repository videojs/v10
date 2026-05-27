import { describe, expect, it, vi } from 'vitest';
import { MediaStreamTypes } from '../../../../core/media/types';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { nativeHlsStreamType } from '../stream-type';

function setup(duration: number = Number.NaN) {
  const host = new HTMLVideoElementHost();
  const dispose = nativeHlsStreamType().install(host);
  const video = document.createElement('video');
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
  host.target = video;
  return { host, video, dispose };
}

function setDuration(video: HTMLVideoElement, duration: number) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
}

describe('nativeHlsStreamType', () => {
  it('starts as UNKNOWN before any signal', () => {
    const host = new HTMLVideoElementHost();
    nativeHlsStreamType().install(host);
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('detects LIVE when duration is Infinity', () => {
    const { host, video } = setup();
    setDuration(video, Number.POSITIVE_INFINITY);
    video.dispatchEvent(new Event('durationchange'));
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);
  });

  it('detects ON_DEMAND when duration is finite and positive', () => {
    const { host, video } = setup();
    setDuration(video, 42);
    video.dispatchEvent(new Event('loadedmetadata'));
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });

  it('stays UNKNOWN when duration is NaN', () => {
    const { host, video } = setup();
    video.dispatchEvent(new Event('durationchange'));
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('dispatches streamtypechange on transition', () => {
    const { host, video } = setup();

    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));

    expect(handler).toHaveBeenCalledOnce();
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });

  it('does not dispatch streamtypechange when value is unchanged', () => {
    const { host, video } = setup();

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));

    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    video.dispatchEvent(new Event('durationchange'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('locks in user override and ignores subsequent detection', () => {
    const { host, video } = setup();

    host.streamType = MediaStreamTypes.LIVE;
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);
  });

  it('returns control to detection when set back to UNKNOWN', () => {
    const { host, video } = setup();

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);

    host.streamType = MediaStreamTypes.LIVE;
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);

    host.streamType = MediaStreamTypes.UNKNOWN;
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });

  it('resets to UNKNOWN on emptied', () => {
    const { host, video } = setup();

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);

    video.dispatchEvent(new Event('emptied'));
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('stops detecting after dispose', () => {
    const { host, video, dispose } = setup();

    dispose();

    setDuration(video, 30);
    video.dispatchEvent(new Event('durationchange'));

    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('re-detects on re-attach', () => {
    const { host } = setup();

    host.target = null;

    const video2 = document.createElement('video');
    Object.defineProperty(video2, 'duration', { value: 60, configurable: true });
    host.target = video2;
    video2.dispatchEvent(new Event('durationchange'));

    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });
});
