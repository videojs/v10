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
    const source = `import { Container, Controls, PlayButton, Poster, Slider, Tooltip } from '@fixture/core';
import { styles } from './tokens';

export interface SkinProps {
  children?: unknown;
}

export function Skin({ children, className }: SkinProps) {
  return <Container className={[styles.root, className]}>{children}<Poster /><Controls.Root><Slider.Track className={[styles.track]} /><Tooltip.Trigger><PlayButton className={[styles.action]} /></Tooltip.Trigger></Controls.Root></Container>;
}
`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform((code) => {
            const cn = code.ref.import('@fixture/style', 'cn');
            const BaseSkinProps = code.ref.import('@fixture/react', 'BaseSkinProps', { type: true });
            const Button = code.ref.import('@fixture/renderers', 'Button');
            const SliderTrack = code.ref.import('@fixture/renderers', 'SliderTrack');
            const isString = code.ref.import('@fixture/predicate', 'isString');
            const ReactNode = code.ref.import('react', 'ReactNode', { type: true });

            return [
              code.edit.import.rewrite({ '@fixture/core': '@fixture/react' }),
              code.edit.jsx.element({
                when: code.match.jsx.tag('Tooltip.Trigger'),
                transform: code.edit.jsx.moveChildToProp('render'),
              }),
              code.edit.jsx.element({
                when: code.match.jsx.tag('Controls.Root'),
                transform: code.edit.jsx.addProp('data-controls', ''),
              }),
              code.edit.jsx.element({
                when: code.match.jsx.tag('Container'),
                transform: code.edit.jsx.addPropsSpread('rest'),
              }),
              code.edit.jsx.element({
                when: code.match.jsx.tag('Poster'),
                transform: () => {
                  return code.create.jsx.renderIf(
                    'poster',
                    code.create.jsx.element('Poster', {
                      src: code.create.value.onlyIf({ value: 'poster', condition: isString }),
                    })
                  );
                },
              }),
              code.edit.jsx.element({
                when: code.match.jsx.tag('PlayButton'),
                transform: code.edit.jsx.addProp('render', code.create.jsx.element(Button)),
              }),
              code.edit.jsx.element({
                when: code.match.jsx.tag(/^Slider\.(Track)$/),
                transform: (element, context) => {
                  const part = context.tagName.split('.')[1];
                  return part === 'Track' ? code.edit.jsx.replaceTag(SliderTrack)(element, context) : undefined;
                },
              }),
              code.edit.jsx.prop({
                when: code.match.all(code.match.jsx.prop('className'), code.match.value.array()),
                transform: ({ value }) => code.create.value.call(cn, code.create.value.arrayItems(value)),
              }),
              code.edit.interface.declaration({
                when: code.match.interface.name('SkinProps'),
                transform: code.edit.interface.extends(BaseSkinProps),
              }),
              code.edit.interface.property({
                when: code.match.all(code.match.interface.name(/Props$/), code.match.interface.property('children')),
                transform: code.edit.interface.setType(() =>
                  code.create.type.union(code.create.type.named(ReactNode), code.create.type.undefined())
                ),
              }),
              code.edit.function.declaration({
                when: code.match.function.name('Skin'),
                transform: code.edit.function.addProps(['poster', { name: 'rest', spread: true }]),
              }),
            ];
          }),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('from "@fixture/react"');
    expect(result.code).toContain('from "@fixture/renderers"');
    expect(result.code).toContain('from "@fixture/predicate"');
    expect(result.code).toContain('from "@fixture/style"');
    expect(result.code).toContain('import type { ReactNode } from "react"');
    expect(compact(result.code)).toContain(compact('interface SkinProps extends BaseSkinProps'));
    expect(compact(result.code)).toContain(compact('children?: ReactNode | undefined;'));
    expect(compact(result.code)).toContain(
      compact('function Skin({ children, className, poster, ...rest }: SkinProps)')
    );
    expect(compact(result.code)).toContain(compact('<Container className={cn(styles.root, className)} {...rest}>'));
    expect(compact(result.code)).toContain(
      compact('{poster && <Poster src={isString(poster) ? poster : undefined} />}')
    );
    expect(compact(result.code)).toContain(compact('<PlayButton className={cn(styles.action)} render={<Button />} />'));
    expect(compact(result.code)).toContain(compact('<SliderTrack className={cn(styles.track)} />'));
    expect(compact(result.code)).toContain(compact('<Controls.Root data-controls="">'));
    expect(compact(result.code)).toContain(compact('<Tooltip.Trigger render={<PlayButton'));
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
          transform((code) => [
            code.edit.jsx.element({
              when: code.match.jsx.tag('Root'),
              transform: code.edit.jsx.addProp('data-root', ''),
            }),
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
