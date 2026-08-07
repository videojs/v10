import { describe, expect, it } from 'vitest';
import { SliderChapterCore } from '../slider-chapter-core';

const cues = [
  { startTime: 0, endTime: 10, text: 'Introduction' },
  { startTime: 15, endTime: 20, text: 'Main' },
];

describe('SliderChapterCore', () => {
  const core = new SliderChapterCore();

  it('returns the title of the active cue', () => {
    expect(core.getState(cues, 5).title).toBe('Introduction');
    expect(core.getState(cues, 15).title).toBe('Main');
  });

  it('returns an empty title outside cue ranges', () => {
    expect(core.getState(cues, 12).title).toBe('');
    expect(core.getState(cues, 21).title).toBe('');
  });

  it('includes the final cue end time', () => {
    expect(core.getState(cues, 20).title).toBe('Main');
  });
});
