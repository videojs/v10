import { describe, expect, it } from 'vitest';
import { compile, transform } from '..';

const compact = (value: string): string => value.replace(/\s+/g, '');

describe('transform', () => {
  it('composes generic import, JSX attribute, JSX element, and interface edits', async () => {
    const source = `import { Action, Backdrop, Frame, Hint, Range, Toolbar } from '@fixture/core';
import { styles } from './tokens';

export interface TemplateProps {
  children?: unknown;
}

export function Template({ children, className }: TemplateProps) {
  return <Frame className={[styles.root, className]}>{children}<Backdrop /><Toolbar.Root><Range.Track className={[styles.track]} /><Hint.Trigger><Action className={[styles.action]} /></Hint.Trigger></Toolbar.Root></Frame>;
}
`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform((code) => {
            const cn = code.import('@fixture/style', 'cn');
            const BaseTemplateProps = code.import('@fixture/react', 'BaseTemplateProps', { type: true });
            const Button = code.import('@fixture/renderers', 'Button');
            const RangeTrack = code.import('@fixture/renderers', 'RangeTrack');
            const isString = code.import('@fixture/predicate', 'isString');
            const ReactNode = code.import('react', 'ReactNode', { type: true });

            return [
              code.imports({ '@fixture/core': '@fixture/react' }),
              code.jsx.element('Hint.Trigger').childToProp('render'),
              code.jsx.element('Toolbar.Root').addProp('data-toolbar', ''),
              code.jsx.element('Frame').spreadProps('rest'),
              code.jsx.element('Backdrop').replace(() =>
                code.jsx.if(
                  'backdrop',
                  code.jsx.create('Backdrop', {
                    src: code.value.when('backdrop', isString),
                  })
                )
              ),
              code.jsx.element('Action').addProp('render', code.jsx.create(Button)),
              code.jsx.element(/^Range\.(Track)$/).replace(RangeTrack),
              code.jsx
                .props('className')
                .where(code.value.isArray())
                .replace(({ value }) => code.value.call(cn, code.value.arrayItems(value))),
              code.interface('TemplateProps').extends(BaseTemplateProps),
              code
                .interface(/Props$/)
                .property('children')
                .setType(() => code.type.union(code.type.named(ReactNode), code.type.undefined())),
              code.function('Template').addProps(['backdrop', { name: 'rest', spread: true }]),
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
    expect(compact(result.code)).toContain(compact('interface TemplateProps extends BaseTemplateProps'));
    expect(compact(result.code)).toContain(compact('children?: ReactNode | undefined;'));
    expect(compact(result.code)).toContain(
      compact('function Template({ children, className, backdrop, ...rest }: TemplateProps)')
    );
    expect(compact(result.code)).toContain(compact('<Frame className={cn(styles.root, className)} {...rest}>'));
    expect(compact(result.code)).toContain(
      compact('{backdrop && <Backdrop src={isString(backdrop) ? backdrop : undefined} />}')
    );
    expect(compact(result.code)).toContain(compact('<Action className={cn(styles.action)} render={<Button />} />'));
    expect(compact(result.code)).toContain(compact('<RangeTrack className={cn(styles.track)} />'));
    expect(compact(result.code)).toContain(compact('<Toolbar.Root data-toolbar="">'));
    expect(compact(result.code)).toContain(compact('<Hint.Trigger render={<Action'));
  });

  it('materializes default lazy imports', async () => {
    const source = `export function Template(){ return <Action/>; }`;

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
    const source = `import { Frame } from '@fixture/core';

export function Template({ backdrop }) {
  return <Frame />;
}
`;

    const result = await compile(source, {
      config: {
        plugins: [
          transform((code) => {
            const useBackdrop = code.import('@fixture/react', 'useBackdrop');

            return [
              code.module.prepend(
                code.statement.const('TOP_ACTIONS', code.value.array([code.value.string('togglePaused')]), {
                  asConst: true,
                  export: true,
                })
              ),
              code
                .function('Template')
                .prepend(code.statement.const('backdropState', code.value.call(useBackdrop, ['backdrop']))),
              code
                .function('Template')
                .beforeReturn(code.statement.const('ready', code.value.call('Boolean', ['backdropState']))),
            ];
          }),
        ],
      },
    });

    const compactCode = compact(result.code);

    expect(result.code.indexOf('import { Frame }')).toBeLessThan(result.code.indexOf('export const TOP_ACTIONS'));
    expect(result.code).toContain('import { useBackdrop } from "@fixture/react"');
    expect(compactCode).toContain(compact('export const TOP_ACTIONS = ["togglePaused"] as const;'));
    expect(compactCode).toContain(compact('const backdropState = useBackdrop(backdrop);'));
    expect(compactCode).toContain(compact('const ready = Boolean(backdropState);return <Frame />;'));
  });
});
