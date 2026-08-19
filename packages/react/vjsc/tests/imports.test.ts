import { describe, expect, it } from 'vitest';

import { resolvePackageImport } from '../imports';

describe('resolvePackageImport', () => {
  it('maps public component and runtime references to React source modules', () => {
    expect(resolvePackageImport({ source: '@videojs/react', name: 'AirPlayButton' })).toEqual({
      source: '@/ui/airplay-button',
      name: 'AirPlayButton',
    });
    expect(resolvePackageImport({ source: '@videojs/react', name: 'usePlayer' })).toEqual({
      source: '@/player/context',
      name: 'usePlayer',
    });
    expect(resolvePackageImport({ source: '@videojs/react/icons/minimal', name: 'PlayIcon' })).toEqual({
      source: '@/icons/minimal',
      name: 'PlayIcon',
    });
  });

  it('preserves references owned by other packages', () => {
    const reference = { source: 'react', name: 'ReactNode' };

    expect(resolvePackageImport(reference)).toBe(reference);
  });
});
