import { describe, expect, it } from 'vitest';
import { EMPTY_TEXT_TRACKS } from '../constants';

describe('EMPTY_TEXT_TRACKS', () => {
  it('iterates as an empty list', () => {
    expect([...EMPTY_TEXT_TRACKS]).toEqual([]);
    expect(Array.from(EMPTY_TEXT_TRACKS)).toEqual([]);
  });

  it('returns null from getTrackById', () => {
    expect(EMPTY_TEXT_TRACKS.getTrackById?.('missing')).toBeNull();
  });
});
