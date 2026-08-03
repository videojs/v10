import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifySnapshots, writeClassification } from '../api-reference-sync.ts';

const temporaryDirectories: string[] = [];

function createSnapshots() {
  const root = mkdtempSync(join(tmpdir(), 'api-reference-sync-'));
  temporaryDirectories.push(root);

  for (const phase of ['before', 'after']) {
    for (const kind of ['components', 'utils']) {
      mkdirSync(join(root, `${phase}-${kind}`), { recursive: true });
    }
  }

  return root;
}

function writeJson(
  root: string,
  phase: 'before' | 'after',
  kind: 'components' | 'utils',
  file: string,
  value: unknown
) {
  writeFileSync(join(root, `${phase}-${kind}`, file), JSON.stringify(value));
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('classifySnapshots', () => {
  it('classifies added, changed, unchanged, and removed references', () => {
    const root = createSnapshots();
    writeJson(root, 'before', 'components', 'changed.json', { value: 'before' });
    writeJson(root, 'after', 'components', 'changed.json', { value: 'after' });
    writeJson(root, 'before', 'components', 'same.json', { value: 'same' });
    writeJson(root, 'after', 'components', 'same.json', { value: 'same' });
    writeJson(root, 'before', 'components', 'removed.json', {});
    writeJson(root, 'after', 'components', 'new.json', {});

    const result = classifySnapshots(root);

    expect(result.components).toEqual({
      new: ['new.json'],
      changed: ['changed.json'],
      unchanged: ['same.json'],
      removed: ['removed.json'],
    });
    expect(result.hasDiff).toBe(true);
    expect(result.hasNew).toBe(true);
  });

  it('reports identical snapshots without changes', () => {
    const root = createSnapshots();
    writeJson(root, 'before', 'utils', 'same.json', { value: 'same' });
    writeJson(root, 'after', 'utils', 'same.json', { value: 'same' });

    expect(classifySnapshots(root)).toMatchObject({ hasDiff: false, hasNew: false });
  });

  it('writes the workflow artifact contract', () => {
    const root = createSnapshots();
    writeJson(root, 'after', 'utils', 'new.json', { name: 'newUtil' });
    const result = classifySnapshots(root);

    writeClassification(root, result);

    expect(readFileSync(join(root, 'new-utils.txt'), 'utf-8')).toBe('new.json\n');
    expect(JSON.parse(readFileSync(join(root, 'classification.json'), 'utf-8'))).toMatchObject({
      hasDiff: true,
      hasNew: true,
    });
    expect(readFileSync(join(root, 'diff.patch'), 'utf-8')).toContain('new.json');
  });

  it('writes patches larger than the spawnSync default buffer', () => {
    const root = createSnapshots();
    writeJson(root, 'after', 'components', 'large.json', { value: 'x'.repeat(1024 * 1024) });
    const result = classifySnapshots(root);

    writeClassification(root, result);

    expect(statSync(join(root, 'diff.patch')).size).toBeGreaterThan(1024 * 1024);
  });
});
