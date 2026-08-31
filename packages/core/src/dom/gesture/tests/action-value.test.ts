import { DEFAULT_SEEK_STEP, DEFAULT_VOLUME_STEP } from '@videojs/core';
import { describe, expect, it } from 'vite-plus/test';

import { getGestureActionValue } from '../action-value';

describe('getGestureActionValue', () => {
  it('uses the seek direction from the region', () => {
    expect(getGestureActionValue('seekStep', 'left')).toBe(-DEFAULT_SEEK_STEP);
    expect(getGestureActionValue('seekStep', 'right')).toBe(DEFAULT_SEEK_STEP);
  });

  it('uses the default volume step', () => {
    expect(getGestureActionValue('volumeStep', 'left')).toBe(DEFAULT_VOLUME_STEP / 100);
  });

  it('preserves an explicit value', () => {
    expect(getGestureActionValue('seekStep', 'left', 5)).toBe(5);
  });
});
