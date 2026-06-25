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
            const cn = code.import('@fixture/style', 'cn');
            const BaseSkinProps = code.import('@fixture/react', 'BaseSkinProps', { type: true });
            const Button = code.import('@fixture/renderers', 'Button');
            const SliderTrack = code.import('@fixture/renderers', 'SliderTrack');
            const isString = code.import('@fixture/predicate', 'isString');
            const ReactNode = code.import('react', 'ReactNode', { type: true });

            return [
              code.imports({ '@fixture/core': '@fixture/react' }),
              code.jsx.element('Tooltip.Trigger').childToProp('render'),
              code.jsx.element('Controls.Root').addProp('data-controls', ''),
              code.jsx.element('Container').spreadProps('rest'),
              code.jsx.element('Poster').replace(() =>
                code.jsx.if(
                  'poster',
                  code.jsx.create('Poster', {
                    src: code.value.when('poster', isString),
                  })
                )
              ),
              code.jsx.element('PlayButton').addProp('render', code.jsx.create(Button)),
              code.jsx.element(/^Slider\.(Track)$/).replace(SliderTrack),
              code.jsx
                .props('className')
                .where(code.value.isArray())
                .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
              code.interface('SkinProps').extends(BaseSkinProps),
              code
                .interface(/Props$/)
                .property('children')
                .setType(() => code.type.union(code.type.named(ReactNode), code.type.undefined())),
              code.function('Skin').addProps(['poster', { name: 'rest', spread: true }]),
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

  it('materializes default lazy imports', async () => {
    const source = `export function Skin(){ return <Action/>; }`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform((code) => {
            const Button = code.import('@fixture/renderers', 'Button', { default: true });

            return [code.jsx.element('Action').addProp('render', code.jsx.create(Button))];
          }),
        ],
      },
    });

    expect(result.code).toContain('import Button from "@fixture/renderers"');
    expect(compact(result.code)).toContain(compact('<Action render={<Button />} />'));
  });

  it('adds module constants and function-scope statements', async () => {
    const source = `import { Container } from '@fixture/core';

export function DefaultVideoSkin({ poster }) {
  return <Container />;
}
`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform((code) => {
            const usePoster = code.import('@fixture/react', 'usePoster');

            return [
              code.module.prepend(
                code.statement.const('TOP_ACTIONS', code.value.array([code.value.string('togglePaused')]), {
                  asConst: true,
                  export: true,
                })
              ),
              code
                .function('DefaultVideoSkin')
                .prepend(code.statement.const('posterState', code.value.call(usePoster, ['poster']))),
              code
                .function('DefaultVideoSkin')
                .beforeReturn(code.statement.const('ready', code.value.call('Boolean', ['posterState']))),
            ];
          }),
        ],
      },
    });

    const compactCode = compact(result.code);

    expect(result.code.indexOf('import { Container }')).toBeLessThan(result.code.indexOf('export const TOP_ACTIONS'));
    expect(result.code).toContain('import { usePoster } from "@fixture/react"');
    expect(compactCode).toContain(compact('export const TOP_ACTIONS = ["togglePaused"] as const;'));
    expect(compactCode).toContain(compact('const posterState = usePoster(poster);'));
    expect(compactCode).toContain(compact('const ready = Boolean(posterState);return <Container />;'));
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
        plugins: [transform((code) => [code.jsx.element('Root').addProp('data-root', '')])],
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
