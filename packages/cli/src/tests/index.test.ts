import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

const bin = resolve(import.meta.dirname, '../..', packageJson.bin.videojs);

function run(...args: string[]): string {
  return execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

function runWithStderr(...args: string[]) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

describe('bin', () => {
  it('reports the CLI package and its version', () => {
    expect(JSON.parse(run('--version', '--json'))).toEqual({
      schemaVersion: 1,
      kind: 'version',
      package: '@videojs/cli',
      packageVersion: packageJson.version,
    });
  });

  it('points the deprecated docs and config commands at agents init', () => {
    for (const command of ['docs', 'config']) {
      const result = runWithStderr(command, 'installation');

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(`\`videojs ${command}\` is deprecated`);
      expect(result.stderr).toContain('npx @videojs/cli agents init');
    }
  });

  it('prints version-pinned commands for this release', () => {
    expect(run('agents', 'init')).toContain(`npx @videojs/cli@${packageJson.version} agents init`);
  });

  it('bundles the installation renderer so only Node built-ins are imported at runtime', () => {
    const [shebang, ...lines] = readFileSync(bin, 'utf8').split('\n');
    // Bundled output hoists every module import to the top; later `import` text belongs to generated code samples.
    const header = lines.slice(
      0,
      lines.findIndex((line) => !line.startsWith('import '))
    );
    const specifiers = header.map((line) => line.match(/ from "([^"]+)";$/)?.[1]);

    expect(shebang).toBe('#!/usr/bin/env node');
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.every((specifier) => specifier?.startsWith('node:'))).toBe(true);
  });
});
