import { describe, expect, it } from 'vitest';
import { releaseTags } from '../releaseTags';

describe('releaseTags', () => {
  it('tags stability', () => {
    expect(releaseTags({ prerelease: true, breaking: false })).toEqual(['Release', 'Prerelease']);
    expect(releaseTags({ prerelease: false, breaking: false })).toEqual(['Release', 'Stable']);
  });

  it('tags breaking releases', () => {
    expect(releaseTags({ prerelease: false, breaking: true })).toEqual(['Release', 'Stable', 'Breaking changes']);
  });
});
