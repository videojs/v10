import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { jsx } from '../../config';
import { dropUnusedLocals } from '../drop-unused-locals';

const wrap = async (source: string): Promise<string> =>
  (await compile(source, { config: { target: jsx({ transforms: [dropUnusedLocals()] }) } })).code;

describe('dropUnusedLocals', () => {
  it('drops an unused cn() local', async () => {
    const code = await wrap(`const x = cn('a', 'b');\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });

  it('keeps a referenced cn() local', async () => {
    const code = await wrap(`const x = cn('a', 'b');\nfunction App(){ return <Foo className={x}/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused non-cn() local (conservative)', async () => {
    const code = await wrap(`const x = computeSomething();\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused cn() with non-pure args (conservative)', async () => {
    const code = await wrap(`const x = cn('a', sideEffect());\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps exported declarations untouched', async () => {
    const code = await wrap(`export const x = cn('a', 'b');\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('export const x');
  });

  it('drops nested cn() arg patterns too', async () => {
    const code = await wrap(`const x = cn('a', cn('b', 'c'));\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });
});
