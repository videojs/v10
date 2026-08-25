import { parseSync } from 'oxc-parser';
import { RolldownMagicString } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { collectFunctionDeclarations, prependBlockBody } from '..';

describe('prependBlockBody', () => {
  it('inserts source before existing function statements', () => {
    const code = 'function Component() { return null; }';
    const ast = parseSync('fixture.ts', code).program;
    const body = collectFunctionDeclarations(ast)[0]?.body;
    const magicString = new RolldownMagicString(code);

    if (!body) throw new Error('Expected fixture function body.');

    prependBlockBody(magicString, body, 'const value = true;');

    expect(magicString.toString()).toContain('{\nconst value = true;\n return null; }');
  });
});
