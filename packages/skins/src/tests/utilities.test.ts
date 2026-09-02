import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vite-plus/test';

import { utilities } from '../styles/utilities';
import { vars } from '../styles/vars';

describe('utilities', () => {
  test('describes every shared utility, variant, and computed theme key', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../styles/tailwind.shared.css'), 'utf8');
    const declared = [...source.matchAll(/@(utility|custom-variant)\s+([^\s{(;]+)/g)].map(([, , name]) => name!);
    const themeBlock = /@theme inline \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? '';
    const themeKeys = [...themeBlock.matchAll(/^\s*(--[a-z-]+):\s*([^;]+);/gm)].map(([, key, value]) => [key!, value!]);
    const aliases = themeKeys.filter(([, value]) => /^var\(--media-[a-z-]+\)$/.test(value)).map(([key]) => key);
    const computed = themeKeys.filter(([, value]) => !/^var\(--media-[a-z-]+\)$/.test(value)).map(([key]) => key);

    expect(declared.length).toBeGreaterThan(10);
    expect([...declared, ...computed].sort()).toEqual(Object.keys(utilities).sort());
    expect(aliases.length).toBeGreaterThan(10);

    for (const key of aliases) {
      const alias = themeKeys.find(([name]) => name === key)![1].slice('var('.length, -1);

      expect(Object.keys(vars)).toContain(alias);
    }
  });
});
