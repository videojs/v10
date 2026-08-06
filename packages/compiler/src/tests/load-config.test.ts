import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findConfig, loadConfig, loadConfigFile, loadProjectConfig, loadProjectConfigFile } from '../load-config';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-config-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('findConfig', () => {
  it('finds a default config file and resolves an override', () => {
    const defaultPath = join(workDir, 'compiler.config.mjs');
    const overridePath = join(workDir, 'config', 'custom.mjs');
    mkdirSync(join(workDir, 'config'));
    writeFileSync(defaultPath, 'export default {};\n', 'utf8');
    writeFileSync(overridePath, 'export default {};\n', 'utf8');

    expect(findConfig(workDir, undefined)).toBe(defaultPath);
    expect(findConfig(workDir, 'config/custom.mjs')).toBe(overridePath);
  });

  it('returns null when no default config exists', () => {
    expect(findConfig(workDir, undefined)).toBeNull();
  });
});

describe('loadConfigFile', () => {
  it('loads a single compiler config', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default { input: 'src/input.tsx' };\n`, 'utf8');

    await expect(loadConfigFile(configPath)).resolves.toMatchObject({
      config: { input: 'src/input.tsx' },
      configPath,
      configDir: workDir,
    });
  });

  it('rejects a project config array', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default [{ input: 'one.tsx' }, { input: 'two.tsx' }];\n`, 'utf8');

    await expect(loadConfigFile(configPath)).rejects.toThrow('must export a single compiler config');
  });

  it('rejects structurally invalid config at the load boundary', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default { input: 42 };\n`, 'utf8');

    await expect(loadConfigFile(configPath)).rejects.toThrow(
      '`input` must be a string, string array, or string record'
    );
  });

  it('rejects ambiguous output paths', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default { output: { dir: 'dist', file: 'dist/out.tsx' } };\n`, 'utf8');

    await expect(loadConfigFile(configPath)).rejects.toThrow('`output.dir` and `output.file` cannot be used together');
  });

  it('reloads a config file after its contents change', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default { input: 'one.tsx' };\n`, 'utf8');
    await expect(loadConfigFile(configPath)).resolves.toMatchObject({ config: { input: 'one.tsx' } });

    writeFileSync(configPath, `export default { input: 'two.tsx' };\n`, 'utf8');
    const changedAt = new Date(Date.now() + 2_000);
    utimesSync(configPath, changedAt, changedAt);

    await expect(loadConfigFile(configPath)).resolves.toMatchObject({ config: { input: 'two.tsx' } });
  });
});

describe('loadProjectConfigFile', () => {
  it('loads a multi-target project config', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export const config = [{ input: 'one.tsx' }, { input: 'two.tsx' }];\n`, 'utf8');

    const loaded = await loadProjectConfigFile(configPath);

    expect(loaded.config).toEqual([{ input: 'one.tsx' }, { input: 'two.tsx' }]);
    expect(loaded.configDir).toBe(workDir);
  });
});

describe('loadConfig', () => {
  it('returns null without a discovered config', async () => {
    await expect(loadConfig(workDir, undefined)).resolves.toBeNull();
  });
});

describe('loadProjectConfig', () => {
  it('loads a discovered project config', async () => {
    const configPath = join(workDir, 'compiler.config.mjs');
    writeFileSync(configPath, `export default { input: 'input.tsx' };\n`, 'utf8');

    await expect(loadProjectConfig(workDir, undefined)).resolves.toMatchObject({
      config: { input: 'input.tsx' },
      configPath,
      configDir: workDir,
    });
  });
});
