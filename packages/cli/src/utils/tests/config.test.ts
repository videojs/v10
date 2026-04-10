import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const testDir = join(tmpdir(), 'videojs-cli-test-' + Date.now());

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => testDir,
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

  it('rejects unknown config key on set', () => {
    expect(() => setConfigValue('foo', 'bar')).toThrow('Unknown config key: "foo"');
  });

  it('rejects invalid value for known key on set', () => {
    expect(() => setConfigValue('framework', 'vue')).toThrow('Invalid value "vue" for "framework"');
  });

  it('rejects unknown config key on get', () => {
    expect(() => getConfigValue('foo')).toThrow('Unknown config key: "foo"');
  });
});
