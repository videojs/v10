import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createIconElementModule } from '../icon-element';

describe('createIconElementModule', () => {
  it('generates a watched custom-element module from source SVGs', () => {
    const module = createIconElementModule('minimal', { cwd: resolve(import.meta.dirname, '../../../icons') });

    expect(module.code).toContain(`customElements.define('media-icon', MediaIconElement)`);
    expect(module.code).toContain('"play"');
    expect(module.watchFiles.some((file) => file.endsWith('/minimal/play.svg'))).toBe(true);
  });
});
