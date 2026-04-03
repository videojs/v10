import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config file path to use a temp directory
const testDir = join(tmpdir(), 'videojs-cli-test-' + Date.now());
const testConfigFile = join(testDir, 'config.json');

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => join(tmpdir(), 'videojs-cli-test-' + Date.now()),
  };
});

// Re-import after mock
const { getConfigValue, listConfig, setConfigValue } = await import('../config.js');

describe('config', () => {
  it('returns empty config when no file exists', () => {
    const config = listConfig();
    expect(config).toEqual({});
  });

  it('returns undefined for missing key', () => {
    expect(getConfigValue('framework')).toBeUndefined();
  });

  it('sets and gets a value', () => {
    setConfigValue('framework', 'react');
    expect(getConfigValue('framework')).toBe('react');
  });

  it('overwrites existing value', () => {
    setConfigValue('framework', 'html');
    setConfigValue('framework', 'react');
    expect(getConfigValue('framework')).toBe('react');
  });

  it('lists all config entries', () => {
    setConfigValue('framework', 'html');
    const config = listConfig();
    expect(config).toHaveProperty('framework', 'html');
  });
});
