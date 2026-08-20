import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { iconElementPlugin } from '../element-plugin';

describe('iconElementPlugin', () => {
  it('loads an element family directly from SVG source', () => {
    const plugin = iconElementPlugin();
    const load = typeof plugin.load === 'object' ? plugin.load.handler : plugin.load;
    const addWatchFile = vi.fn();
    const code = load?.call({ addWatchFile } as never, '\0@videojs/icons/element/minimal', { moduleType: 'js' });

    expect(code).toContain('MediaIconElement.register(family, icons)');
    expect(code).toContain('"play":"<svg');
    expect(addWatchFile).toHaveBeenCalledWith(resolve(import.meta.dirname, '../../src/assets/minimal/play.svg'));
  });
});
