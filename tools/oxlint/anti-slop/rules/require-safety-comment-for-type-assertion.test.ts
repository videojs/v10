import type { ESTree, SourceCode } from '@oxlint/plugins';
import { describe, expect, it } from 'vite-plus/test';

import { hasSafetyComment } from './require-safety-comment-for-type-assertion';

function createAssertion(source: string, assertionText: string): ESTree.TSAsExpression {
  const start = source.indexOf(assertionText);
  const program = { type: 'Program', start: 0, end: source.length } as ESTree.Program;
  const declaration = {
    type: 'VariableDeclaration',
    start: 0,
    end: source.length,
    parent: program,
  } as ESTree.VariableDeclaration;

  return {
    type: 'TSAsExpression',
    start,
    end: start + assertionText.length,
    parent: declaration,
  } as ESTree.TSAsExpression;
}

function createSourceCode(source: string): SourceCode {
  return {
    text: source,
    getCommentsBefore: () => [],
  } as SourceCode;
}

describe('hasSafetyComment', () => {
  it('accepts a formatter-relocated comment inside the containing statement', () => {
    const source = 'const value = condition ? /* SAFETY: schema validated. */ (input as Value) : fallback;';
    expect(hasSafetyComment(createSourceCode(source), createAssertion(source, 'input as Value'))).toBe(true);
  });

  it('rejects an unrelated comment after the assertion', () => {
    const source = 'const value = input as Value; /* SAFETY: unrelated later operation. */';
    expect(hasSafetyComment(createSourceCode(source), createAssertion(source, 'input as Value'))).toBe(false);
  });

  it('rejects a distant comment outside the containing statement', () => {
    const source = '/* SAFETY: previous operation. */\nconst value = input as Value;';
    const assertion = createAssertion(source, 'input as Value');
    assertion.parent.start = source.indexOf('const value');
    expect(hasSafetyComment(createSourceCode(source), assertion)).toBe(false);
  });
});
