import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeSource, fixSource, isSourcePath } from './check-source-spacing.mjs';
import { pathsFromHookInput } from './enforce-source-spacing.mjs';

describe('analyzeSource', () => {
  it('requires control flow to be separated from adjacent statements', () => {
    const source = `function run(input: string) {
  const value = parse(input);
  if (!value) {
    return;
  }
  return value;
}
`;
    const result = analyzeSource('example.ts', source);

    assert.equal(result.errors.length, 0);
    assert.deepEqual(
      result.violations.map(({ current, line, previous }) => ({ current, line, previous })),
      [
        { current: 'If', line: 3, previous: 'VariableDeclaration' },
        { current: 'Return', line: 6, previous: 'If' },
      ]
    );
  });

  it('allows logical declaration groups and separated control flow', () => {
    const source = `function run(input: string) {
  const value = parse(input);
  const valid = validate(value);

  if (!valid) {
    return;
  }

  return value;
}
`;

    assert.deepEqual(analyzeSource('example.ts', source), { errors: [], violations: [] });
  });

  it('does not count blank lines inside block comments as separation', () => {
    const source = `function run() {
  const value = parse();
  /* Parsing and validation are separate phases.

     Validation starts here. */
  if (value) use(value);
}\n`;
    const result = analyzeSource('example.ts', source);

    assert.equal(result.violations.length, 1);
    assert.deepEqual(
      result.violations.map(({ current, line, previous }) => ({ current, line, previous })),
      [{ current: 'If', line: 6, previous: 'VariableDeclaration' }]
    );
  });
});

describe('fixSource', () => {
  it('adds blank lines without detaching a leading comment', () => {
    const source = `function run(input: string) {
  const value = parse(input);
  // Stop when parsing fails.
  if (!value) {
    return;
  }
  return value;
}
`;
    const result = analyzeSource('example.ts', source);
    const fixed = fixSource(source, result.violations);

    assert.equal(
      fixed,
      `function run(input: string) {
  const value = parse(input);

  // Stop when parsing fails.
  if (!value) {
    return;
  }

  return value;
}
`
    );
    assert.equal(analyzeSource('example.ts', fixed).violations.length, 0);
  });

  it('separates statements written on the same line', () => {
    const source = `function run() { const value = parse(); if (value) return value; return null; }\n`;
    const result = analyzeSource('example.ts', source);
    const fixed = fixSource(source, result.violations);

    assert.equal(
      fixed,
      `function run() { const value = parse();

if (value) return value;

return null; }\n`
    );
    assert.equal(analyzeSource('example.ts', fixed).violations.length, 0);
  });

  it('does not insert a blank line inside a trailing block comment', () => {
    const source = `function run() {
  use(); /* The condition is checked after setup
    because setup updates the state. */
  if (ready) use();
}\n`;
    const result = analyzeSource('example.ts', source);
    const fixed = fixSource(source, result.violations);

    assert.equal(
      fixed,
      `function run() {
  use(); /* The condition is checked after setup
    because setup updates the state. */

  if (ready) use();
}\n`
    );
    assert.equal(analyzeSource('example.ts', fixed).violations.length, 0);
  });
});

describe('isSourcePath', () => {
  it('includes authored source and excludes generated or fixture paths', () => {
    assert.equal(isSourcePath('packages/core/src/index.ts'), true);
    assert.equal(isSourcePath('packages/core/dist/index.js'), false);
    assert.equal(isSourcePath('packages/core/fixtures/example.ts'), false);
  });
});

describe('pathsFromHookInput', () => {
  it('reads Claude file paths', () => {
    assert.deepEqual(
      pathsFromHookInput({
        cwd: process.cwd(),
        tool_input: { file_path: `${process.cwd()}/packages/core/src/index.ts` },
      }),
      ['packages/core/src/index.ts']
    );
  });

  it('reads Codex patch paths', () => {
    assert.deepEqual(
      pathsFromHookInput({
        cwd: process.cwd(),
        tool_input: {
          command: '*** Begin Patch\n*** Update File: packages/core/src/index.ts\n*** End Patch',
        },
      }),
      ['packages/core/src/index.ts']
    );
  });
});
