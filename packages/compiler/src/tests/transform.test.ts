import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compile, compileProject, transform } from '..';

const compact = (value: string): string => value.replace(/\s+/g, '');

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'compiler-transform-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('transform', () => {
  it('composes generic import, JSX attribute, JSX element, and interface edits', async () => {
    const source = `import { Container, Controls, Tooltip } from '@fixture/core';
import { styles } from './tokens';

export interface SkinProps {
  children?: unknown;
}

export function Skin({ children, className }: SkinProps) {
  return <Container className={[styles.root, className]}>{children}<Controls.Root><Tooltip.Trigger><button /></Tooltip.Trigger></Controls.Root></Container>;
}
`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform(({ ref, match, create, edit }) => {
            const cn = ref.import('@fixture/style', 'cn');
            const ReactNode = ref.import('react', 'ReactNode', { type: true });

            return [
              edit.import.rewrite({ '@fixture/core': '@fixture/react' }),
              edit.jsx.element({
                match: match.jsx.tag('Tooltip.Trigger'),
                transform: edit.jsx.childAsProp('render'),
              }),
              edit.jsx.element({
                match: match.jsx.tag('Controls.Root'),
                transform: edit.jsx.addAttribute('data-controls', ''),
              }),
              edit.jsx.attribute({
                match: match.all(match.jsx.attribute('className'), match.jsx.value.array()),
                transform: ({ value }) => create.expr.call(cn, create.jsx.arrayElements(value)),
              }),
              edit.interface.property({
                match: match.all(match.interface.name(/Props$/), match.interface.property('children')),
                transform: edit.interface.setType(() =>
                  create.type.union(create.type.ref(ReactNode), create.type.undefined())
                ),
              }),
            ];
          }),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('from "@fixture/react"');
    expect(result.code).toContain('from "@fixture/style"');
    expect(result.code).toContain('import type { ReactNode } from "react"');
    expect(compact(result.code)).toContain(compact('children?: ReactNode | undefined;'));
    expect(compact(result.code)).toContain(compact('className={cn(styles.root, className)}'));
    expect(compact(result.code)).toContain(compact('<Controls.Root data-controls="">'));
    expect(compact(result.code)).toContain(compact('<Tooltip.Trigger render={<button />} />'));
  });
});

describe('compileProject', () => {
  it('compiles config input entries to configured output files', async () => {
    const inputFile = join(workDir, 'src', 'skin.tsx');
    mkdirSync(join(workDir, 'src'), { recursive: true });
    writeFileSync(inputFile, `export function App(){ return <Root/>; }\n`, 'utf8');

    const result = await compileProject(
      {
        input: { defaultSkin: 'src/skin.tsx' },
        output: {
          dir: 'dist',
          entryFileNames: '[name].tsx',
          banner: '// Generated\n',
        },
        plugins: [
          transform(({ match, edit }) => [
            edit.jsx.element({ match: match.jsx.tag('Root'), transform: edit.jsx.addAttribute('data-root', '') }),
          ]),
        ],
      },
      { configDir: workDir }
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({ type: 'chunk', fileName: join(workDir, 'dist', 'defaultSkin.tsx') });
    expect(result.files[0]!.source).toContain('// Generated');
    expect(result.files[0]!.source).toContain('data-root=""');
  });
});
