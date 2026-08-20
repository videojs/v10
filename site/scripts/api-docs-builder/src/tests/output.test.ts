import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateReferenceGroup, writeReferenceGroup } from '../output';

const stringSchema = {
  safeParse(value: unknown) {
    return typeof value === 'string'
      ? ({ success: true, data: value } as const)
      : ({
          success: false,
          error: { issues: [{ path: ['value'], message: 'Expected string' }] },
        } as const);
  },
};

describe('API docs output', () => {
  let tempPath: string | undefined;

  afterEach(() => {
    if (tempPath) fs.rmSync(tempPath, { recursive: true, force: true });
    tempPath = undefined;
  });

  it('validates the entire group before writing', () => {
    const result = validateReferenceGroup({
      name: 'example',
      outputPath: '/unused',
      schema: stringSchema,
      docs: [
        { fileName: 'valid.json', label: 'Valid', data: 'value' },
        { fileName: 'invalid.json', label: 'Invalid', data: 42 },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toEqual([
      {
        label: 'Invalid',
        issues: [{ path: ['value'], message: 'Expected string' }],
      },
    ]);
  });

  it('rejects duplicate and unsafe output filenames', () => {
    const result = validateReferenceGroup({
      name: 'example',
      outputPath: '/unused',
      schema: stringSchema,
      docs: [
        { fileName: 'same.json', label: 'First', data: 'one' },
        { fileName: 'same.json', label: 'Second', data: 'two' },
        { fileName: '../outside.json', label: 'Outside', data: 'three' },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.map((error) => error.label)).toEqual(['Second', 'Outside']);
  });

  it('rejects unexpectedly empty output groups', () => {
    const result = validateReferenceGroup({
      name: 'example',
      outputPath: '/unused',
      schema: stringSchema,
      docs: [],
      minimumDocs: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0]?.issues[0]?.message).toBe('Expected at least 1 generated document(s), received 0');
  });

  it('writes current JSON, removes stale JSON, and preserves other files', () => {
    tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'api-docs-output-'));
    const outputPath = path.join(tempPath, 'generated');
    fs.mkdirSync(outputPath);
    fs.writeFileSync(path.join(outputPath, 'stale.json'), '{}');
    fs.writeFileSync(path.join(outputPath, 'keep.txt'), 'keep');

    const validation = validateReferenceGroup({
      name: 'example',
      outputPath,
      schema: stringSchema,
      docs: [{ fileName: 'current.json', label: 'Current', data: 'value' }],
    });
    expect(validation.success).toBe(true);
    if (!validation.success) return;

    const result = writeReferenceGroup(validation.group);

    expect(result).toEqual({ written: 1, removed: ['stale.json'] });
    expect(fs.readFileSync(path.join(outputPath, 'current.json'), 'utf-8')).toBe('"value"\n');
    expect(fs.existsSync(path.join(outputPath, 'stale.json'))).toBe(false);
    expect(fs.readFileSync(path.join(outputPath, 'keep.txt'), 'utf-8')).toBe('keep');
  });
});
