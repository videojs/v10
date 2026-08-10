import { describe, expect, it } from 'vitest';
import { formatGeneratedFile } from '../files';

describe('formatGeneratedFile', () => {
  it('separates generated TypeScript statements while keeping imports together', async () => {
    const output = await formatGeneratedFile(
      'component.tsx',
      `import { A } from './a'; import { B } from './b'; const value = 1; export interface Props { value: number; } export function Component() { return <A>{value}<B /></A>; }`
    );

    expect(output).toContain("import { A } from './a';\nimport { B } from './b';\n\nconst value = 1;");
    expect(output).toContain('const value = 1;\n\nexport interface Props');
    expect(output).toContain('}\n\nexport function Component()');
  });

  it('leaves non-TypeScript output to oxfmt', async () => {
    await expect(formatGeneratedFile('styles.css', '.a{color:red}.b{color:blue}')).resolves.toBe(
      '.a {\n  color: red;\n}\n.b {\n  color: blue;\n}\n'
    );
  });
});
