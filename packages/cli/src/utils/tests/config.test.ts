import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

type ConfigModule = typeof import('../config.js');

let config: ConfigModule;
let testDir: string;

beforeEach(async () => {
  testDir = mkdtempSync(join(tmpdir(), 'videojs-cli-test-'));

  vi.resetModules();
  vi.doMock('node:os', async () => ({
    ...(await vi.importActual<typeof import('node:os')>('node:os')),
    homedir: () => testDir,
  }));

  config = await import('../config.js');
});

afterEach(() => {
  vi.doUnmock('node:os');
  rmSync(testDir, { recursive: true, force: true });
});

describe('config', () => {
  it('returns empty config when no file exists', () => {
    const result = config.listConfig();

    expect(result).toEqual({});
  });

  it('returns undefined for missing key', () => {
    expect(config.getConfigValue('framework')).toBeUndefined();
  });

  it('sets and gets a value', () => {
    config.setConfigValue('framework', 'react');

    expect(config.getConfigValue('framework')).toBe('react');
  });

  it('overwrites existing value', () => {
    config.setConfigValue('framework', 'html');
    config.setConfigValue('framework', 'react');

    expect(config.getConfigValue('framework')).toBe('react');
  });

  it('lists all config entries', () => {
    config.setConfigValue('framework', 'html');
    const result = config.listConfig();

    expect(result).toHaveProperty('framework', 'html');
  });

  it('treats malformed config as empty', () => {
    const configDir = join(testDir, '.videojs');

    mkdirSync(configDir);
    writeFileSync(join(configDir, 'config.json'), '{not json', 'utf-8');

    expect(config.listConfig()).toEqual({});
  });

  it('rejects unknown config key on set', () => {
    expect(() => config.setConfigValue('foo', 'bar')).toThrow('Unknown config key: "foo"');
  });

  it('rejects invalid value for known key on set', () => {
    expect(() => config.setConfigValue('framework', 'vue')).toThrow('Invalid value "vue" for "framework"');
  });

  it('rejects unknown config key on get', () => {
    expect(() => config.getConfigValue('foo')).toThrow('Unknown config key: "foo"');
  });
});
