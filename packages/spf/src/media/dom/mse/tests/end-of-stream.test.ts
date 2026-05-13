import { describe, expect, it } from 'vitest';
import { type AppendedSegment, isLastSegmentAppended } from '../end-of-stream';

function appendedFromIds(segmentIds: string[]): AppendedSegment[] {
  return segmentIds.map((id) => ({ id }));
}

describe('isLastSegmentAppended', () => {
  it('returns true when expected list is empty', () => {
    expect(isLastSegmentAppended([], [])).toBe(true);
    expect(isLastSegmentAppended([], appendedFromIds(['seg-0']))).toBe(true);
    expect(isLastSegmentAppended([], undefined)).toBe(true);
  });

  it('returns false when appended list is undefined or empty', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }], undefined)).toBe(false);
    expect(isLastSegmentAppended([{ id: 'seg-0' }], [])).toBe(false);
  });

  it('returns true when the temporally last segment is present', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appendedFromIds(['seg-0', 'seg-1']))).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    expect(
      isLastSegmentAppended(
        [{ id: 'seg-0' }, { id: 'seg-1' }, { id: 'seg-2' }, { id: 'seg-3' }],
        appendedFromIds(['seg-2', 'seg-3'])
      )
    ).toBe(true);
  });

  it('returns true on the seek-back scenario — last segment present alongside re-loaded earlier segments', () => {
    expect(
      isLastSegmentAppended(
        [{ id: 'seg-0' }, { id: 'seg-1' }, { id: 'seg-2' }, { id: 'seg-3' }],
        appendedFromIds(['seg-0', 'seg-2', 'seg-3'])
      )
    ).toBe(true);
  });

  it('returns false when the last segment ID is missing', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appendedFromIds(['seg-0']))).toBe(false);
  });

  it('returns false when the last segment is present but marked partial', () => {
    const appended: AppendedSegment[] = [{ id: 'seg-0' }, { id: 'seg-1', partial: true }];
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appended)).toBe(false);
  });
});
