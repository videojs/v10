import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('@videojs/core package exports', () => {
  it('keeps compiler components workspace-only', () => {
    const publishedExports = structuredClone(packageJson.exports);

    delete publishedExports['./components'];

    expect(packageJson.publishConfig.exports).toEqual(publishedExports);
    expect(packageJson.dependencies).not.toHaveProperty('@videojs/jsx');
    expect(packageJson.devDependencies).toHaveProperty('@videojs/jsx', 'workspace:*');
  });
});
