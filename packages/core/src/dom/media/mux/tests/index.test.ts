import { describe, expect, it } from 'vitest';
import { MuxMediaBase } from '..';

describe('MuxMediaBase', () => {
  it('defaults playbackId to null', () => {
    const base = new MuxMediaBase();
    expect(base.playbackId).toBeNull();
  });

  it('defaults customDomain to mux.com', () => {
    const base = new MuxMediaBase();
    expect(base.customDomain).toBe('mux.com');
  });

  it('sets src when playbackId is set', () => {
    const base = new MuxMediaBase();
    base.playbackId = 'abc123';

    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('uses customDomain in the generated src', () => {
    const base = new MuxMediaBase();
    base.customDomain = 'example.com';
    base.playbackId = 'abc123';

    expect(base.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('updates src when customDomain changes after playbackId', () => {
    const base = new MuxMediaBase();
    base.playbackId = 'abc123';
    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');

    base.customDomain = 'custom.tv';
    expect(base.src).toBe('https://stream.custom.tv/abc123.m3u8');
  });

  it('falls back to default domain when customDomain is set to empty', () => {
    const base = new MuxMediaBase();
    base.customDomain = 'custom.tv';
    base.playbackId = 'abc123';
    expect(base.src).toBe('https://stream.custom.tv/abc123.m3u8');

    base.customDomain = '';
    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('does not update src when playbackId is set to the same value', () => {
    const base = new MuxMediaBase();
    base.playbackId = 'abc123';
    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');

    base.src = 'https://override.example.com/video.m3u8';
    base.playbackId = 'abc123';
    expect(base.src).toBe('https://override.example.com/video.m3u8');
  });

  it('does not trigger syncSrc when customDomain is set to empty while already default', () => {
    const base = new MuxMediaBase();
    base.playbackId = 'abc123';
    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');

    base.src = 'https://override.example.com/video.m3u8';
    base.customDomain = '';
    expect(base.src).toBe('https://override.example.com/video.m3u8');
  });

  it('clears src when playbackId is null and customDomain changes', () => {
    const base = new MuxMediaBase();
    base.src = 'https://manual.example.com/video.m3u8';
    base.customDomain = 'custom.tv';

    expect(base.src).toBe('');
  });
});
