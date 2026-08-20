import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { createIconSchemaModule } from '../schema';

describe('createIconSchemaModule', () => {
  it('loads each family directly from its canonical assets', () => {
    const generated = createIconSchemaModule('minimal');

    expect(generated.schema.source).toBe('@videojs/icons/vjsc');
    expect(Object.keys(generated.schema.definitions)).toContain('PlayIcon');
    expect(existsSync(resolve(import.meta.dirname, '../../vjsc.ts'))).toBe(false);
  });
});
