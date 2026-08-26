import type { Plugin } from 'rolldown';
import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import type { ComponentTarget } from '../../target/definition';
import { readComponentSource } from '../component-meta';
import { componentSourcePlugin } from '../component-source';
import { reactTargetPropsPlugin } from '../react-target-props';

const MODULE_ID = '\0fixture.tsx?target=react';
const reactTarget = {
  source: '@fixture/components',
  resolve: () => undefined,
  components: {},
  primitives: {},
  types: {},
  transforms: [],
  jsx: { importSource: 'react', attributes: 'react' },
} satisfies ComponentTarget;

describe('reactTargetPropsPlugin', () => {
  it('composes class arrays and preserves stateful className forwarding', async () => {
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
      external: (id) => !id.startsWith('.') && !id.startsWith('\0'),
      transform: { jsx: 'preserve' },
      plugins: [
        fixturePlugin(`
          import { Container, Poster } from '@videojs/react';
          export const View = ({ className }) => <>
            <Poster className={['poster', className]} />
            <Container className={[className, 'container']} />
          </>;
        `),
        reactTargetPropsPlugin({ targets: [reactTarget] }),
        componentSourcePlugin(),
        inspect,
      ],
    });

    await bundle.generate({ format: 'es' });

    const source = readComponentSource(meta);

    expect(source).toContain(`import { cn, resolveClassName } from "@videojs/utils/style";`);
    expect(source).toContain(`className={state => cn('poster', resolveClassName(className, state))}`);
    expect(source).toContain(`className={cn('container', className)}`);
  });
});

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
