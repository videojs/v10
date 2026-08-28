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
});

const target = defineComponentTarget<typeof schema>()(({ element, imported }) => ({
  source: '@fixture/components',
  resolve: ({ component, part }) =>
    imported({
      from: '@fixture/react',
      name: component,
      path: part ? [part] : undefined,
      props: { from: '@fixture/react', name: component, path: [part ? `${part}Props` : 'Props'] },
    }),
  primitives: {
    Box: element('div', {
      props: { from: 'react', name: 'ComponentProps', intrinsic: 'div' },
    }),
  },
  types: {
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
      import { Box, type Props, type PropsOf, type VjscNode } from 'vjsc/components';
      import { Local } from './local';
      import { setup } from './setup';
      import type { BuildOnly } from './build-only';

      export interface Alias extends PropsOf<typeof Local> {
        child?: VjscNode;
      }

      export function PlayButton(
        { custom, ...props }: Props<
          {
            custom?: boolean;
            VjscNode?: string;
            child?: VjscNode;
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
    expect(source).toContain('Tooltip } from "@fixture/react";');
    expect(source).toContain('import type { ComponentProps, ReactNode } from "react";');
    expect(source).toContain('interface Alias extends NonNullable<ComponentProps<typeof Local>>');
    expect(source).toContain('child?: ReactNode;');
    expect(source).toContain('export interface PlayButtonProps extends Omit<PlayButtonPrimitive.Props, "children">');
    expect(source).toContain('custom?: boolean');
    expect(source).toContain('VjscNode?: string');
    expect(source).toContain('child?: ReactNode');
    expect(source).toContain(`label?: 'VjscNode'`);
    expect(source).toContain('nested?: { value: string }');
    expect(source).not.toContain('type VjscNode');
    expect(source).toContain('{ custom, ...props }: PlayButtonProps = {}');
    expect(source).toContain('export interface PanelProps extends Omit<ComponentProps<"div">, "children">');
    expect(source).toContain('export interface ButtonTooltipProps extends Omit<Tooltip.RootProps, "children">');
    expect(source).not.toContain('Tooltip.Root.RootProps');
    expect(source).not.toContain("from 'vjsc/components'");
    expect(source).not.toContain("from '@fixture/components'");
    expect(source).toContain("import { setup } from './setup';");
    expect(source).not.toContain("from './build-only'");
    expect(source.indexOf(`'use client'`)).toBeLessThan(source.indexOf('import type { ComponentProps, ReactNode }'));
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
