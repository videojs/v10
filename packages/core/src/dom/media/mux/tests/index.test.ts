import { describe, expect, it } from 'vitest';
import { MuxMediaBase } from '..';

describe('MuxMediaBase', () => {
  it('accepts src directly', () => {
    const base = new MuxMediaBase();
    base.src = 'https://stream.mux.com/abc123.m3u8';

    expect(base.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('accepts non-Mux src', () => {
    const base = new MuxMediaBase();
    base.src = 'https://example.com/video.m3u8';

    expect(base.src).toBe('https://example.com/video.m3u8');
  });

  it('defaults PLAYER_SOFTWARE_NAME to empty', () => {
    expect(MuxMediaBase.PLAYER_SOFTWARE_NAME).toBe('');
  });
});
