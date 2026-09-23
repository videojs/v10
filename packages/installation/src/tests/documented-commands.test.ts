import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runAgentsInit } from '../node';

const workspaceRoot = resolve(import.meta.dirname, '../../../..');

describe('documented agents init commands', () => {
  it('accepts every command in the root and package READMEs', () => {
    const readmes = [
      resolve(workspaceRoot, 'README.md'),
      ...globSync('packages/{*,adapters/*,extensions/*}/README.md', { cwd: workspaceRoot }).map((path) =>
        resolve(workspaceRoot, path)
      ),
    ];
    const failures: string[] = [];
    let commandCount = 0;

    for (const readme of readmes) {
      const source = readFileSync(readme, 'utf8');

      for (const match of source.matchAll(/^npx @videojs\/(react|html)(?:@latest)? agents init([^\n]*)$/gm)) {
        commandCount += 1;
        const owner = match[1] as 'html' | 'react';
        const flags = match[2]!.trim().split(/\s+/).filter(Boolean);
        const result = runAgentsInit(owner, '10.0.0-test', ['agents', 'init', ...flags]);

        if (result.exitCode !== 0) failures.push(`${readme}: ${match[0]}\n${result.stderr || result.stdout}`);
      }
    }

    expect(commandCount).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
