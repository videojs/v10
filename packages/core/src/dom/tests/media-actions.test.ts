import { describe, expect, it } from 'vite-plus/test';

import { DEFAULT_SEEK_STEP, DEFAULT_VOLUME_STEP } from '../../core/ui/constants';
import { getMediaInputActionValue } from '../media-actions';

describe('getMediaInputActionValue', () => {
  it('defaults forward and backward seek steps', () => {
    expect(getMediaInputActionValue('seekStep', 'ArrowRight')).toBe(DEFAULT_SEEK_STEP);
    expect(getMediaInputActionValue('seekStep', 'ArrowLeft')).toBe(-DEFAULT_SEEK_STEP);
    expect(getMediaInputActionValue('seekStep', 'l')).toBe(DEFAULT_SEEK_STEP);
    expect(getMediaInputActionValue('seekStep', 'j')).toBe(-DEFAULT_SEEK_STEP);
  });

  it('defaults volume steps', () => {
    expect(getMediaInputActionValue('volumeStep', 'ArrowUp')).toBe(DEFAULT_VOLUME_STEP / 100);
    expect(getMediaInputActionValue('volumeStep', 'ArrowDown')).toBe(-DEFAULT_VOLUME_STEP / 100);
  });

  it('preserves explicit values', () => {
    expect(getMediaInputActionValue('volumeStep', 'ArrowDown', 0.1)).toBe(0.1);
  });

  it('does not default other actions', () => {
    expect(getMediaInputActionValue('togglePaused', 'Space')).toBeUndefined();
  });
});
