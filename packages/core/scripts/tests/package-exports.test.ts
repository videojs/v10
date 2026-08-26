import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vite-plus/test';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('@videojs/core package exports', () => {
  it('keeps the VJSC component schema workspace-only', () => {
    const publishedExports = structuredClone(packageJson.exports);

    delete publishedExports['./vjsc'];

    expect(packageJson.publishConfig.exports).toEqual(publishedExports);
    expect(packageJson.dependencies).not.toHaveProperty('vjsc');
    expect(packageJson.devDependencies).toHaveProperty('vjsc', 'workspace:*');
  });
});
