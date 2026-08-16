import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { jsx, rewrite, transform } from '..';
import { addProp, byTag, childAsProp, lowerTemplateParts, lowerTemplates, replace } from '../jsx';

const compact = (value: string): string => value.replace(/\s+/g, '');

describe('transform', () => {
  it('lowers named templates to a render prop or literal template root', async () => {
    const source = `import { Template } from '@videojs/jsx';
export function Timeline() {
  return <Chapters><Template name="chapter" className="chapter"><Track /></Template><Track /></Chapters>;
}`;
    const react = await transform(source, {
      config: {
        target: jsx({
          transforms: [
            lowerTemplates({
              templates: {
                chapter: { kind: 'render-prop', parent: 'Chapters', prop: 'renderChapter', rootTag: 'div' },
              },
            }),
          ],
        }),
      },
    });
    const html = await transform(source, {
      config: {
        target: jsx({
          transforms: [
            lowerTemplates({
              templates: {
                chapter: { kind: 'element', parent: 'Chapters', rootTag: 'div' },
              },
            }),
          ],
        }),
      },
    });

    expect(compact(react.code)).toContain(
      compact(
        '<Chapters renderChapter={props => (<div {...props} className="chapter"><Track /></div>)}><Track /></Chapters>'
      )
    );
    expect(compact(html.code)).toContain(
      compact('<Chapters><template><div className="chapter"><Track /></div></template><Track /></Chapters>')
    );
    expect(`${react.code}\n${html.code}`).not.toContain('name="chapter"');
  });

  it('rejects invalid named template declarations', async () => {
    const config = {
      target: jsx({
        transforms: [
          lowerTemplates({
            templates: {
              chapter: { kind: 'element' as const, parent: 'Chapters', rootTag: 'div' },
            },
          }),
        ],
      }),
    };

    await expect(
      transform(`export function Timeline(){ return <Chapters><Template></Template></Chapters>; }`, { config })
    ).rejects.toThrow('requires a static `name` prop');
    await expect(
      transform(
        `export function Timeline(){ return <Chapters><Template name="chapter"><Track /></Template><Template name="chapter"><Track /></Template></Chapters>; }`,
        { config }
      )
    ).rejects.toThrow('Duplicate <Template name="chapter">');
    await expect(
      transform(`export function Timeline(){ return <Root><Template name="chapter"><Track /></Template></Root>; }`, {
        config,
      })
    ).rejects.toThrow('must be a direct child of <Chapters>');
  });

  it('lowers named template parts into callback values and HTML metadata', async () => {
    const source = `export function Options(){ return <Group><Template name="option"><Item><Template.Part name="label"><Text /></Template.Part><Template.Part name="badge"><Text className="badge" /></Template.Part></Item></Template></Group>; }`;
    const react = await transform(source, {
      config: {
        target: jsx({
          transforms: [
            lowerTemplateParts({
              parts: {
                'option:label': { kind: 'value', root: 'item', property: 'label' },
                'option:badge': { kind: 'value', root: 'item', property: 'badge', optional: true },
              },
            }),
            lowerTemplates({
              templates: {
                option: { kind: 'render-prop', parent: 'Group', prop: 'renderItem', parameters: ['props', 'item'] },
              },
            }),
          ],
        }),
      },
    });
    const html = await transform(source, {
      config: {
        target: jsx({
          transforms: [
            lowerTemplateParts({
              parts: {
                'option:label': { kind: 'attribute', attribute: 'data-part', value: 'label' },
                'option:badge': { kind: 'attribute', attribute: 'data-part', value: 'badge' },
              },
            }),
            lowerTemplates({ templates: { option: { kind: 'element', parent: 'Group' } } }),
          ],
        }),
      },
    });

    expect(compact(react.code)).toContain(
      compact(
        '<Group renderItem={(props, item) => (<Item {...props}><Text>{item.label}</Text>{item.badge ? <Text className="badge">{item.badge}</Text> : null}</Item>)}></Group>'
      )
    );
    expect(compact(html.code)).toContain(
      compact(
        '<Group><template><Item><Text data-part="label" /><Text className="badge" data-part="badge" /></Item></template></Group>'
      )
    );
  });

  it('adds a props binding to a parameterless function', async () => {
    const result = await transform(`export function Button(){ return <Root/>; }`, {
      config: {
        plugins: [
          rewrite((code) => [
            code.function('Button').addProps([{ name: 'props', spread: true }]),
            code.jsx.element('Root').spreadProps('props'),
          ]),
        ],
      },
    });

    expect(compact(result.code)).toContain(compact('function Button({ ...props })'));
    expect(compact(result.code)).toContain(compact('<Root {...props} />'));
  });

  it('replaces a function props binding with a typed target shape', async () => {
    const result = await transform(`export function Skin(){ return <Root/>; }`, {
      config: {
        plugins: [
          rewrite((code) => {
            const ContainerProps = code.import('@fixture/react', 'ContainerProps', { type: true });
            return [
              code
                .function('Skin')
                .setProps(
                  [
                    { name: 'disabled', initializer: code.value.boolean(false) },
                    'children',
                    { name: 'props', spread: true },
                  ],
                  { type: ContainerProps, initializer: code.value.object() }
                ),
            ];
          }),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('import type { ContainerProps } from "@fixture/react"');
    expect(compact(result.code)).toContain(
      compact('function Skin({ disabled = false, children, ...props }: ContainerProps = {})')
    );
  });

  it('composes generic import, JSX attribute, JSX element, and interface edits', async () => {
    const source = `import { Action, Backdrop, Frame, Hint, Range, Toolbar } from '@fixture/core';
import { styles } from './tokens';

export interface TemplateProps {
  children?: unknown;
  metadata?: string;
}

export function Template({ children, className }: TemplateProps) {
  return <Frame className={[styles.root, className]}>{children}<Backdrop /><Toolbar.Root><Range.Track className={[styles.track]} /><Hint.Trigger><Action className={[styles.action]} /></Hint.Trigger></Toolbar.Root></Frame>;
}
`;

    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
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
              code.interface('TemplateProps').replaceExtends('BaseTemplateProps', 'Template.RootProps'),
              code
                .interface(/Props$/)
                .property('children')
                .setType(() => code.type.union(code.type.named(ReactNode), code.type.undefined())),
              code
                .interface('TemplateProps')
                .property('metadata')
                .setType(() => code.type.unknown()),
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
    expect(compact(result.code)).toContain(compact('interface TemplateProps extends Template.RootProps'));
    expect(compact(result.code)).toContain(compact('children?: ReactNode | undefined;'));
    expect(compact(result.code)).toContain(compact('metadata?: unknown;'));
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

  it('keeps legacy and rewrite JSX node edits aligned', async () => {
    const source = `export function Template(){ return <Old><Action><Child/></Action></Old>; }`;
    const legacy = await transform(source, {
      config: {
        target: jsx({
          transforms: [
            childAsProp({ match: byTag('Action'), prop: 'render' }),
            addProp({ match: byTag('Old'), prop: 'count', value: ts.factory.createNumericLiteral(1) }),
            replace({ match: byTag('Old'), with: { source: '@fixture/react', name: 'Panel' } }),
          ],
        }),
      },
    });
    const rewritten = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
            const Panel = code.import('@fixture/react', 'Panel');
            return [
              code.jsx.element('Action').childToProp('render'),
              code.jsx.element('Old').addProp('count', code.value.number(1)),
              code.jsx.element('Old').replace(Panel),
            ];
          }),
        ],
      },
    });

    expect(compact(rewritten.code)).toBe(compact(legacy.code));
  });

  it('materializes default lazy imports', async () => {
    const source = `export function Template(){ return <Action/>; }`;

    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
            const Button = code.import('@fixture/renderers', 'Button', { default: true });

            return [code.jsx.element('Action').addProp('render', code.jsx.create(Button))];
          }),
        ],
      },
    });

    expect(result.code).toContain('import Button from "@fixture/renderers"');
    expect(compact(result.code)).toContain(compact('<Action render={<Button />} />'));
  });

  it('composes JSX wrapper removal, prop forwarding, and prop renaming', async () => {
    const source = `export function Template() {
  return <Popover.Root open delay={200}><Popover.Trigger><Button className="trigger" /></Popover.Trigger><Popover.Popup className="popup" side="top" /></Popover.Root>;
}`;

    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => [
            code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' }),
            code.jsx.element('Popover.Trigger').unwrap(),
            code.jsx.props('className').rename('class'),
          ]),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(compact(result.code)).toContain(compact('<Button class="trigger" />'));
    expect(compact(result.code)).toContain(compact('<Popover.Popup open delay={200} class="popup" side="top" />'));
    expect(result.code).not.toContain('Popover.Root');
    expect(result.code).not.toContain('Popover.Trigger');
    expect(result.code).not.toContain('className');
  });

  it('scopes JSX wrapper removal to a matching function', async () => {
    const source = `export function Target() { return <Group><Item /></Group>; }
export function Other() { return <Group><Item /></Group>; }`;
    const result = await transform(source, {
      config: {
        plugins: [rewrite((code) => [code.function('Target').jsx.element('Group').unwrap()])],
      },
    });

    expect(compact(result.code)).toContain(compact('function Target() { return <><Item /></>; }'));
    expect(compact(result.code)).toContain(compact('function Other() { return <Group><Item /></Group>; }'));
  });

  it('scopes JSX prop edits to matching element tags', async () => {
    const source = `export function Template(){ return <Panel className="component"><div className="native" /></Panel>; }`;
    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => [
            code.jsx
              .props('className')
              .on(/^[a-z]/)
              .rename('class'),
          ]),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('<Panel className="component">');
    expect(compact(result.code)).toContain(compact('<div class="native" />'));
  });

  it('scopes JSX lowering to one function', async () => {
    const source = `export function Target(){ return <Root><Primitive className="base"><Slot /></Primitive></Root>; }
export function Other(){ return <Root><Primitive className="base"><Slot /></Primitive></Root>; }`;
    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
            const target = code.function('Target');
            return [
              target.jsx.element('Root').addProp('className', () => 'target'),
              target.jsx.element('Slot').remove(),
              target.jsx.element('Primitive').spreadProps('props', { position: 'start' }),
              target.jsx
                .props('className')
                .on('Primitive')
                .replace(({ value }) =>
                  code.value.arrow(
                    ['state'],
                    code.value.conditional(
                      code.value.equal(code.value.typeOf('className'), code.value.string('function')),
                      code.value.call('className', ['state']),
                      value
                    )
                  )
                ),
              target.jsx.element('Primitive').selfClosing(),
            ];
          }),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(compact(result.code)).toContain(
      compact(
        '<Root className="target"><Primitive {...props} className={state => typeof className === "function" ? className(state) : "base"} /></Root>'
      )
    );
    expect(compact(result.code)).toContain(compact('<Root><Primitive className="base"><Slot /></Primitive></Root>'));
  });

  it('inserts declarations beside functions and removes selected variables', async () => {
    const source = `declare const Placeholder: unknown;
export function Target(){ return <Root />; }`;
    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
            const BaseProps = code.import('@fixture/react', 'BaseProps', { type: true });
            return [
              code.variable('Placeholder').remove(),
              code.function('Target').insertBefore(() =>
                code.statement.interface({
                  name: 'TargetProps',
                  export: true,
                  extends: [code.type.named('Omit', [code.type.named(BaseProps), code.type.literal('hidden')])],
                  properties: [
                    { name: 'disabled', optional: true, type: code.type.boolean() },
                    { name: 'value', optional: true, type: code.type.string() },
                    {
                      name: 'render',
                      optional: true,
                      type: code.type.indexed(code.type.named(BaseProps), code.type.literal('render')),
                    },
                  ],
                })
              ),
            ];
          }),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.code).not.toContain('Placeholder');
    expect(result.code).toContain('import type { BaseProps } from "@fixture/react"');
    expect(compact(result.code)).toContain(
      compact(
        'export interface TargetProps extends Omit<BaseProps, "hidden"> { disabled?: boolean; value?: string; render?: BaseProps["render"]; }'
      )
    );
    expect(result.code.indexOf('interface TargetProps')).toBeLessThan(result.code.indexOf('function Target'));
  });

  it('adds missing properties to an existing interface', async () => {
    const source = `export interface Props { current?: string }`;
    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => [
            code.interface('Props').addProperties([
              { name: 'current', optional: true, type: code.type.string() },
              { name: 'className', optional: true, type: code.type.string() },
            ]),
          ]),
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(compact(result.code)).toContain(compact('interface Props { current?: string; className?: string; }'));
  });

  it('rejects ambiguous JSX prop forwarding targets', async () => {
    const source = `export function Template() {
  return <Popover.Root open><Popover.Popup /><Popover.Popup /></Popover.Root>;
}`;

    await expect(
      transform(source, {
        config: {
          plugins: [rewrite((code) => [code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' })])],
        },
      })
    ).rejects.toThrow('expected exactly one direct child');
  });

  it('adds module constants and function-scope statements', async () => {
    const source = `import { Frame } from '@fixture/core';

export function Template({ backdrop }) {
  return <Frame />;
}
`;

    const result = await transform(source, {
      config: {
        plugins: [
          rewrite((code) => {
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
                .prepend(() =>
                  code.statement.const(
                    'backdropState',
                    code.value.call(useBackdrop, [code.value.property('backdrop', 'state')])
                  )
                ),
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
    expect(compactCode).toContain(compact('const backdropState = useBackdrop(backdrop.state);'));
    expect(compactCode).toContain(compact('const ready = Boolean(backdropState);return <Frame />;'));
  });
});
