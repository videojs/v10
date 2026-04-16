// @vitest-environment edge-runtime
// @ts-expect-error -- Node API available in vitest runner
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('Edge SSR safety', () => {
  for (const [key, value] of Object.entries(pkg.exports as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || !('browser' in value)) continue;
    if (key.includes('*') || key.endsWith('.css')) continue;
    const specifier = key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`;
    it(specifier, async () => {
      const mod = await import(specifier);
      expect(mod).toBeDefined();
    });
  }
});
