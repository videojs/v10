import { describe, expect, it } from 'vitest';
import { MediaStreamTypes } from '../../../../core/media/types';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { nativeHlsStreamType } from '../stream-type';

function setup(duration: number = Number.NaN) {
  const host = new HTMLVideoElementHost();
  nativeHlsStreamType().install(host);
  const video = document.createElement('video');
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
  host.target = video;
  return { host, video };
}

function setDuration(video: HTMLVideoElement, duration: number) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
}

describe('nativeHlsStreamType', () => {
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
});
