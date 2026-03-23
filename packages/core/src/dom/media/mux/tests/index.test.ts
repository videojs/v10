import { describe, expect, it } from 'vitest';
import { MuxMediaDelegate } from '..';

describe('MuxMediaDelegate', () => {
  it('defaults playbackId to empty string', () => {
    const delegate = new MuxMediaDelegate();
    expect(delegate.playbackId).toBe('');
  });

  it('defaults customDomain to mux.com', () => {
    const delegate = new MuxMediaDelegate();
    expect(delegate.customDomain).toBe('mux.com');
  });

  it('sets src when playbackId is set', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';

    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('uses customDomain in the generated src', () => {
    const delegate = new MuxMediaDelegate();
    delegate.customDomain = 'example.com';
    delegate.playbackId = 'abc123';

    expect(delegate.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('updates src when customDomain changes after playbackId', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');

    delegate.customDomain = 'custom.tv';
    expect(delegate.src).toBe('https://stream.custom.tv/abc123.m3u8');
  });

  it('falls back to default domain when customDomain is set to empty', () => {
    const delegate = new MuxMediaDelegate();
    delegate.customDomain = 'custom.tv';
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.custom.tv/abc123.m3u8');

    delegate.customDomain = '';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('does not update src when playbackId is set to the same value', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');

    delegate.src = 'https://override.example.com/video.m3u8';
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://override.example.com/video.m3u8');
  });

  it('does not change src when playbackId is empty', () => {
    const delegate = new MuxMediaDelegate();
    delegate.src = 'https://manual.example.com/video.m3u8';
    delegate.customDomain = 'custom.tv';

    expect(delegate.src).toBe('https://manual.example.com/video.m3u8');
  });
});
