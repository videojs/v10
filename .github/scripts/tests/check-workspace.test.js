import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  hasCiEvidence,
  listRepositoryFiles,
  TEST_FILE_RE,
} from '../../../build/scripts/check-workspace.mjs';

describe('workspace test ownership', () => {
  it('recognizes runtime and type test filenames', () => {
    assert.equal(TEST_FILE_RE.test('src/example.test.ts'), true);
    assert.equal(TEST_FILE_RE.test('src/example.spec.tsx'), true);
    assert.equal(TEST_FILE_RE.test('src/example.test-d.ts'), true);
    assert.equal(TEST_FILE_RE.test('src/example.test-d.tsx'), true);
  });

  it('only discovers repository files that are not ignored', () => {
    const root = mkdtempSync(join(tmpdir(), 'videojs-test-ownership-'));

    try {
      execFileSync('git', ['init', '--quiet'], { cwd: root });
      writeFileSync(join(root, '.gitignore'), '.archive/\n.claude/\n');
      mkdirSync(join(root, 'src'));
      mkdirSync(join(root, '.archive'));
      mkdirSync(join(root, '.claude', 'worktrees'), { recursive: true });
      writeFileSync(join(root, 'src', 'owned.test.ts'), '');
      writeFileSync(join(root, '.archive', 'ignored.test.ts'), '');
      writeFileSync(join(root, '.claude', 'worktrees', 'ignored.test.ts'), '');

      assert.deepEqual(listRepositoryFiles(root, (path) => TEST_FILE_RE.test(path)), ['src/owned.test.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires evidence for the complete GitHub script suite', () => {
    const partialCommand = 'node --test .github/scripts/tests/package-test-matrix.test.js';

    assert.equal(hasCiEvidence(partialCommand, ['pnpm test:size']), false);
    assert.equal(hasCiEvidence('pnpm test:size', ['pnpm test:size']), true);
  });
});
