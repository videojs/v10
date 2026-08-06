import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectReferencedIdentifiers } from '../references';

describe('collectReferencedIdentifiers', () => {
  it('collects lexical references without declaration, property, or intrinsic JSX names', () => {
    const sourceFile = ts.createSourceFile(
      'input.tsx',
      `import { unused } from './fixture';
import * as icons from './icons';
interface Options { label: Label; theme: Theme.Options }
const classes = ['root'];
const config = { label: classes };
function View({ value: local }: Props) {
  return <><Menu.Trigger data-label={classes}/><icons.Play/><div/></>;
}`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const referenced = collectReferencedIdentifiers(sourceFile);

    expect(referenced).toEqual(new Set(['Label', 'Theme', 'classes', 'Props', 'Menu', 'icons']));
  });
});
