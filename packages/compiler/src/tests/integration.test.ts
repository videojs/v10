import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from '..';
import { anyTag, byTag, childAsProp, hasChild, jsx, replace } from '../jsx';
import type { ImportRule } from '../transforms';

/**
 * End-to-end smoke test for the generic JSX transform pipeline. The compiler
 * package deliberately avoids Video.js UI semantics here: transforms operate on
 * JSX tags and imports only.
 */
describe('integration: JSX transform pipeline', () => {
  const source = `
import { Alpha, Beta, Gamma } from '@fixture/widgets';
import { Icon } from '@fixture/icons/components';
import { tokens } from '../tokens';

export function Example() {
  return (
    <Alpha.Root className={tokens.root}>
      <Alpha.Trigger>
        <Beta className={tokens.action}>
          <Icon className={tokens.icon} />
        </Beta>
      </Alpha.Trigger>
      <Gamma.Root>
        <Gamma.Trigger>
          <Beta className={tokens.secondary} />
        </Gamma.Trigger>
        <Gamma.Panel className={tokens.panel} />
      </Gamma.Root>
    </Alpha.Root>
  );
}
`;
  let code = '';

  const imports: Record<string, ImportRule> = {
    '@fixture/widgets': (name) => ({
      source: `./widgets/${name.replace(/^[A-Z]/, (m) => m.toLowerCase()).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
      name,
    }),
    '@fixture/icons/components': '@fixture/icons/jsx',
    '../tokens': '@fixture/tokens',
  };

  beforeAll(async () => {
    const result = await compile(source, {
      config: {
        target: jsx({
          imports,
          transforms: [
            replace({
              match: byTag('Gamma.Root', {
                when: hasChild(byTag('Gamma.Trigger', { when: hasChild(byTag('Beta')) })),
              }),
              with: { source: './replacement', name: 'Replacement' },
              mapChildren: () => [],
            }),
            childAsProp({ match: anyTag(['Alpha.Trigger', 'Gamma.Trigger']), prop: 'render' }),
          ],
        }),
      },
    });
    code = result.code;
  });

  it('rewrites component imports to per-identifier sources', () => {
    expect(code).toMatch(/import \{ Alpha \} from "\.\/widgets\/alpha"/);
    expect(code).toMatch(/import \{ Beta \} from "\.\/widgets\/beta"/);
    // Gamma only appears under the replaced subtree, so cleanup drops it.
    expect(code).not.toMatch(/import \{ Gamma \}/);
  });

  it('rewrites icon component imports', () => {
    expect(code).toContain('@fixture/icons/jsx');
    expect(code).not.toContain('@fixture/icons/components');
  });

  it('substitutes the matched subtree with the replacement component', () => {
    expect(code).toContain('<Replacement');
    expect(code).toContain('import { Replacement }');
  });

  it('lifts matched trigger children into render props', () => {
    expect(code).toMatch(/<Alpha\.Trigger render=\{<Beta/);
  });

  it('keeps unrelated relative token imports re-routed by config', () => {
    expect(code).toContain('@fixture/tokens');
  });
});
