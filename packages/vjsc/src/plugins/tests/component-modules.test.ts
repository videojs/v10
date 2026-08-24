import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import type { Plugin } from 'rolldown';
import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { moduleFilename } from '../../utils/module-id';
import { componentModulesPlugin } from '../component-modules';

describe('componentModulesPlugin', () => {
  it('propagates the full transform query through relative source dependencies', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-component-modules-'));
    const entry = join(root, 'entry.tsx');
    const child = join(root, 'child.tsx');
    const model = join(root, 'model.ts');
    writeFileSync(
      entry,
      `import { Child } from './child'; import type { Label } from './model'; export const Entry = ({ label }: { label: Label }) => <Child>{label}</Child>;`
    );
    writeFileSync(child, `export const Child = ({ children }: { children?: unknown }) => <span>{children}</span>;`);
    writeFileSync(model, `export type Label = string;`);

    const transformed: string[] = [];
    const capture: Plugin = {
      name: 'fixture:capture',
      transform: {
        filter: { id: /\.[cm]?[jt]sx?(?:\?|$)/ },
        handler(_code, id) {
          transformed.push(id);
          return null;
        },
      },
      buildEnd() {
        transformed.push(...this.getModuleIds());
      },
    };
    const bundle = await rolldown({
      input: `${entry}?style=tailwind&target=react`,
      experimental: { nativeMagicString: true },
      transform: { jsx: 'preserve' },
      plugins: [componentModulesPlugin(), capture],
    });

    await bundle.generate({ format: 'es' });

    expect(
      transformed.filter((id) => id.includes('?style=tailwind&target=react')).map((id) => basename(moduleFilename(id)))
    ).toEqual(expect.arrayContaining(['entry.tsx', 'child.tsx', 'model.ts']));
  });
});
