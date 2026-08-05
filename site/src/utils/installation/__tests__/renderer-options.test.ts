import { describe, expect, it } from 'vitest';
import { buildOptions } from '../renderer-options';

describe('buildOptions', () => {
  it('returns flat options in the configured order for default-video', () => {
    expect(buildOptions('default-video')).toEqual([
      { value: 'html5-video', label: 'HTML5 Video' },
      { value: 'hls', label: 'HLS' },
      { value: 'dash', label: 'DASH' },
      { value: 'mux-video', label: 'Mux' },
      { value: 'vimeo', label: 'Vimeo' },
    ]);
  });

  it('returns flat options for default-audio', () => {
    expect(buildOptions('default-audio')).toEqual([
      { value: 'html5-audio', label: 'HTML5 Audio' },
      { value: 'mux-audio', label: 'Mux' },
    ]);
  });

  // The live presets exist to surface live-edge state, so they only offer
  // streaming sources — a progressive file can't be live.
  it('offers only streaming options for live-video', () => {
    expect(buildOptions('live-video')).toEqual([
      { value: 'hls', label: 'HLS' },
      { value: 'dash', label: 'DASH' },
      { value: 'mux-video', label: 'Mux' },
    ]);
  });

  it('offers only Mux for live-audio', () => {
    expect(buildOptions('live-audio')).toEqual([{ value: 'mux-audio', label: 'Mux' }]);
  });
});
