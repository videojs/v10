import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncGeneratedFiles } from '..';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('syncGeneratedFiles', () => {
  it('formats generated files and removes stale files from managed roots', async () => {
    const rootDir = createRoot();
    const outputDir = join(rootDir, 'generated');
    writeFileSync(join(outputDir, 'stale.ts'), 'stale');

    await syncGeneratedFiles({
      rootDir,
      managedRoots: ['generated'],
      files: [{ path: 'generated/component.ts', content: 'source' }],
      format: ({ path, content }) => `${path}: ${content}\n`,
    });

    expect(readFileSync(join(outputDir, 'component.ts'), 'utf8')).toBe('generated/component.ts: source\n');
    expect(() => readFileSync(join(outputDir, 'stale.ts'), 'utf8')).toThrow();
  });

  it('reports changed, missing, and stale files in check mode without writing', async () => {
    const rootDir = createRoot();
    const outputDir = join(rootDir, 'generated');
    writeFileSync(join(outputDir, 'changed.ts'), 'old');
    writeFileSync(join(outputDir, 'stale.ts'), 'stale');

    await expect(
      syncGeneratedFiles({
        rootDir,
        managedRoots: ['generated'],
        files: [
          { path: 'generated/changed.ts', content: 'new' },
          { path: 'generated/missing.ts', content: 'new' },
        ],
        check: true,
      })
    ).rejects.toThrow(
      'Generated files are out of date:\n- generated/changed.ts\n- generated/missing.ts\n- generated/stale.ts'
    );

    expect(readFileSync(join(outputDir, 'changed.ts'), 'utf8')).toBe('old');
  });

  it('rejects collisions and paths outside the configured root', async () => {
    const rootDir = createRoot();

    await expect(
      syncGeneratedFiles({
        rootDir,
        managedRoots: ['generated'],
        files: [
          { path: 'generated/file.ts', content: 'one' },
          { path: './generated/file.ts', content: 'two' },
        ],
      })
    ).rejects.toThrow('Generated output collision: generated/file.ts');

    await expect(
      syncGeneratedFiles({
        rootDir,
        managedRoots: ['generated'],
        files: [{ path: '../outside.ts', content: 'source' }],
      })
    ).rejects.toThrow('Generated file path escapes its root: ../outside.ts');

    await expect(
      syncGeneratedFiles({
        rootDir,
        managedRoots: ['../outside'],
        files: [],
      })
    ).rejects.toThrow('Managed root path escapes its root: ../outside');
  });
});

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'vjsc-generate-'));
  roots.push(root);

  const outputDir = join(root, 'generated');
  mkdirSync(outputDir);

  return root;
}
