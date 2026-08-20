import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { iconSchemaVirtualModule } from '../schema';

describe('iconSchemaVirtualModule', () => {
  it('loads each family in memory with a stable module identity', () => {
    const module = iconSchemaVirtualModule('minimal');
    const generated = module.load();

    expect(module.id).toBe('virtual:vjsc/icons-schema/minimal');
    expect(generated.schema.source).toBe('@videojs/icons/vjsc');
    expect(Object.keys(generated.schema.definitions)).toContain('PlayIcon');
    expect(existsSync(module.fileName)).toBe(false);
  });
});
