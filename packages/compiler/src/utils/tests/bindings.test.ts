import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectTopLevelBindingNames } from '../bindings';

describe('collectTopLevelBindingNames', () => {
  it('collects all top-level declaration and import bindings', () => {
    const sourceFile = ts.createSourceFile(
      'input.ts',
      `import Default, { source as named } from './named';
import * as namespace from './namespace';
import alias = require('./alias');
const value = 1, { nested: renamed, rest: [...items] } = source;
function fn() {}
class Class {}
interface Interface {}
type Type = string;
enum Enum {}
namespace Namespace {}`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    expect(collectTopLevelBindingNames(sourceFile)).toEqual(
      new Set([
        'Default',
        'named',
        'namespace',
        'alias',
        'value',
        'renamed',
        'items',
        'fn',
        'Class',
        'Interface',
        'Type',
        'Enum',
        'Namespace',
      ])
    );
  });
});
