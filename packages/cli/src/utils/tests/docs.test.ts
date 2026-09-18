import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('node:fs', async () => ({
  ...(await vi.importActual<typeof import('node:fs')>('node:fs')),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../docs.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue('# Bundled doc');
});

describe('readBundledDoc', () => {
  it('reads nested docs from the requested framework directory', () => {
    expect(readBundledDoc('html', 'concepts/overview')).toBe('# Bundled doc');
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(join('docs', 'html', 'concepts', 'overview.md')),
      'utf-8'
    );
  });

  it.each(['../react/concepts/overview', '..\\react\\concepts\\overview', '../../package', '/tmp/outside'])(
    'rejects a slug outside the requested framework directory: %s',
    (slug) => {
      expect(readBundledDoc('html', slug)).toBeNull();
      expect(existsSync).not.toHaveBeenCalled();
      expect(readFileSync).not.toHaveBeenCalled();
    }
  );

  it('rejects unknown framework paths', () => {
    expect(readBundledDoc('../react', 'concepts/overview')).toBeNull();
    expect(existsSync).not.toHaveBeenCalled();
  });

  it('returns null when the requested doc is not bundled', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    expect(readBundledDoc('react', 'missing')).toBeNull();
    expect(readFileSync).not.toHaveBeenCalled();
  });
});

describe('readLlmsTxt', () => {
  it('reads the index from the requested framework directory', () => {
    expect(readLlmsTxt('react')).toBe('# Bundled doc');
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining(join('docs', 'react', 'llms.txt')), 'utf-8');
  });

  it('rejects unknown framework paths', () => {
    expect(readLlmsTxt('../html')).toBeNull();
    expect(existsSync).not.toHaveBeenCalled();
  });
});

describe('docExistsInAnyFramework', () => {
  it('stops after finding the doc in one framework', () => {
    vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);

    expect(docExistsInAnyFramework('concepts/overview')).toBe(true);
    expect(existsSync).toHaveBeenCalledTimes(2);
  });

  it('rejects slugs that leave a framework directory', () => {
    expect(docExistsInAnyFramework('../react/concepts/overview')).toBe(false);
    expect(existsSync).not.toHaveBeenCalled();
  });
});
