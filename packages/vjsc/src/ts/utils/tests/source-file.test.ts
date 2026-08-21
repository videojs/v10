import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { parseSourceFile } from '../source-file';

describe('parseSourceFile', () => {
  it('selects syntax from the source filename', () => {
    expect(parseSourceFile('const value = <div />;', 'input.tsx').languageVariant).toBe(ts.LanguageVariant.JSX);
    expect(parseSourceFile('const value = 1;', 'input.ts').languageVariant).toBe(ts.LanguageVariant.Standard);
  });
});
