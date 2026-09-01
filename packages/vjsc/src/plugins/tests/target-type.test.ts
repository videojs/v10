import { type Plugin, rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { defineComponent, defineSchema } from '../../components/definition';
import { defineComponentTarget } from '../../target/definition';
import { readComponentSource } from '../component-meta';
import { componentSourcePlugin } from '../component-source';
import { componentTargetPlugin } from '../component-target';
import { targetImportCleanupPlugin } from '../target-import-cleanup';
import { targetTypePlugin } from '../target-type';

const MODULE_ID = '\0fixture.tsx?target=react';
const schema = defineSchema('@fixture/components', {
  PlayButton: defineComponent({ name: 'PlayButton' }),
  Tooltip: defineComponent({
    name: 'Tooltip',
    parts: {
      Root: defineComponent(),
    },
  }),
  Menu: defineComponent({
    name: 'Menu',
    parts: {
      Trigger: defineComponent(),
    },
  }),
});

const target = defineComponentTarget<typeof schema>()(({ element, imported }) => ({
  source: '@fixture/components',
  components: {
    resolve: ({ component, part }) =>
      imported({
        from: '@fixture/react',
        name: component,
        path: part ? [part] : undefined,
        props: { from: '@fixture/react', name: component, path: [part ? `${part}Props` : 'Props'] },
      }),
    rules: {
      Menu: {
        Trigger: () => undefined,
      },
    },
  },
  primitives: {
    Box: element('div', {
      props: { from: 'react', name: 'ComponentProps', intrinsic: 'div' },
    }),
  },
  types: {
    ClassNameValue: { from: 'clsx', name: 'ClassValue' },
    PropsOf: { from: 'react', name: 'ComponentProps' },
    VjscNode: { from: 'react', name: 'ReactNode' },
  },
  jsx: { importSource: 'react', attributes: 'react' },
}));

describe('targetTypePlugin', () => {
  it('derives public props from the forwarded target and lowers source-only types', async () => {
    const source = await transform(`
      'use client';
      import * as $ from '@fixture/components';
      import * as TypeOnly from '@fixture/components';
      import { Box, type ClassNameValue, type Props, type PropsOf, type VjscNode } from 'vjsc/components';
      import { Local } from './local';
      import { setup } from './setup';
      import type { BuildOnly } from './build-only';

      export interface Alias extends PropsOf<typeof Local> {
        child?: VjscNode;
      }

      export type CanonicalType = typeof TypeOnly.Menu.Trigger;

      export interface NamedButtonProps extends BuildOnly {
        named?: boolean;
        className?: ClassNameValue;
      }

      export function NamedButton({ named, ...props }: Props<NamedButtonProps> = {}) {
        return <$.PlayButton {...props} />;
      }

      export function PlayButton(
        { custom, ...props }: Props<
          {
            custom?: boolean;
            VjscNode?: string;
            child?: VjscNode;
            popupClassName?: ClassNameValue;
            controlClassName?: PropsOf<typeof Local>['className'];
            tooltipClassName?: PropsOf<typeof $.Tooltip.Root>['className'];
            menuClassName?: PropsOf<typeof $.Menu.Trigger>['className'];
            label?: 'VjscNode';
          } & { nested?: { value: string } }
        > = {}
      ) {
        return <$.PlayButton {...props} />;
      }

      export function Panel({ className, ...props }: Props = {}) {
        return <Box className={className} {...props} />;
      }

      export function ButtonTooltip({ ...props }: Props = {}) {
        return <$.Tooltip.Root {...props} />;
      }
    `);

    expect(source).toContain('PlayButton as PlayButtonPrimitive');
    expect(source).toContain('Tooltip as TooltipPrimitive');
    expect(source).toContain('import type { ClassValue } from "clsx";');
    expect(source).toMatch(/import type \{ (?:ComponentProps, ReactNode|ReactNode, ComponentProps) \} from "react";/);
    expect(source).toContain('interface Alias extends NonNullable<ComponentProps<typeof Local>>');
    expect(source).toContain('child?: ReactNode;');
    expect(source).toContain('export interface NamedButtonProps extends Omit<PlayButtonPrimitive.Props, "children">');
    expect(source).toContain('named?: boolean;');
    expect(source).toContain('className?: ClassValue;');
    expect(source).toContain('{ named, ...props }: NamedButtonProps = {}');
    expect(source).toContain('export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props, "children">');
    expect(source).toContain('custom?: boolean');
    expect(source).toContain('VjscNode?: string');
    expect(source).toContain('child?: ReactNode');
    expect(source).toContain('popupClassName?: ClassValue');
    expect(source).toContain("controlClassName?: NonNullable<ComponentProps<typeof Local>>['className']");
    expect(source).toContain("tooltipClassName?: TooltipPrimitive.RootProps['className']");
    expect(source).toContain("menuClassName?: MenuPrimitive.TriggerProps['className']");
    expect(source).toContain(`label?: 'VjscNode'`);
    expect(source).toContain('nested?: { value: string }');
    expect(source).not.toContain('type VjscNode');
    expect(source).toContain('{ custom, ...props }: PlayButtonProps = {}');
    expect(source).toMatch(/}\n\nexport function PlayButton/);
    expect(source).toContain('export type PanelProps = Omit<ComponentProps<"div">, "children">');
    expect(source).toMatch(/export type PanelProps = [^\n]+;\n\nexport function Panel/);
    expect(source).toContain('export type ButtonTooltipProps = Omit<TooltipPrimitive.RootProps, "children">');
    expect(source).not.toContain('TooltipPrimitive.Root.RootProps');
    expect(source).not.toContain("from 'vjsc/components'");
    expect(source).not.toContain("from '@fixture/components'");
    expect(source).toContain('import type * as TypeOnly from "@fixture/components";');
    expect(source).toContain("import { setup } from './setup';");
    expect(source).not.toContain("from './build-only'");
    expect(source.indexOf(`'use client'`)).toBeLessThan(source.indexOf('import type'));
  });
});

async function transform(source: string): Promise<string> {
  let meta: unknown;
  const inspect: Plugin = {
    name: 'fixture:inspect',
    buildEnd() {
      meta = this.getModuleInfo(MODULE_ID)?.meta;
    },
  };
  const bundle = await rolldown({
    input: 'fixture',
    experimental: { nativeMagicString: true },
    external: () => true,
    transform: { jsx: 'preserve' },
    plugins: [
      fixturePlugin(source),
      targetTypePlugin({ targets: [target] }),
      componentTargetPlugin({ targets: [target] }),
      targetImportCleanupPlugin({ targets: [target] }),
      componentSourcePlugin(),
      inspect,
    ],
  });

  await bundle.generate({ format: 'es' });
  const output = readComponentSource(meta);
  if (output === undefined) throw new Error('Fixture build did not retain editable source.');

  return output;
}

function fixturePlugin(source: string): Plugin {
  return {
    name: 'fixture:module',
    resolveId(id) {
      return id === 'fixture' ? MODULE_ID : null;
    },
    load(id) {
      return id === MODULE_ID ? { code: source, moduleType: 'tsx' } : null;
    },
  };
}
