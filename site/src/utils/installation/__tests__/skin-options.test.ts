import { describe, expect, it } from 'vitest';
import { buildOptions } from '../skin-options';

describe('buildOptions', () => {
  it('returns video skins for default-video', () => {
    expect(buildOptions('default-video')).toEqual([
      { value: 'video', label: 'Default' },
      { value: 'minimal-video', label: 'Minimal' },
      { value: 'none', label: 'None (headless)' },
    ]);
  });

  it('returns audio skins for default-audio', () => {
    expect(buildOptions('default-audio')).toEqual([
      { value: 'audio', label: 'Default' },
      { value: 'minimal-audio', label: 'Minimal' },
      { value: 'none', label: 'None (headless)' },
    ]);
  });

  it('returns a single fixed skin for background-video', () => {
    expect(buildOptions('background-video')).toEqual([{ value: 'video', label: 'Default' }]);
  });
});
