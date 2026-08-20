import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { collectModuleReferences } from '../module-references';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('input.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe('collectModuleReferences', () => {
  it('collects component names from namespace JSX references', () => {
    const [reference] = collectModuleReferences(
      parse(`
        import * as $ from '@fixture/components';

        export const view = (
          <$.Tooltip.Root>
            <$.CastButton />
          </$.Tooltip.Root>
        );
      `)
    );

    expect(reference).toMatchObject({
      source: '@fixture/components',
      names: ['Tooltip', 'CastButton'],
      ambiguous: false,
    });
  });

  it('marks namespace imports used without a static member as ambiguous', () => {
    const [reference] = collectModuleReferences(
      parse(`
        import * as components from '@fixture/components';

        consume(components);
      `)
    );

    expect(reference).toMatchObject({ names: [], ambiguous: true });
  });

  it('collects namespace members referenced by type queries', () => {
    const [reference] = collectModuleReferences(
      parse(`
        import * as $ from '@fixture/components';

        type Props = ComponentProps<typeof $.PlayButton>;
      `)
    );

    expect(reference).toMatchObject({ names: ['PlayButton'], ambiguous: false });
  });
});
