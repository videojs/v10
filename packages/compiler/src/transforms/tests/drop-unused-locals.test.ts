import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { jsx } from '../../config';
import { dropUnusedLocals } from '../drop-unused-locals';

const wrap = async (source: string): Promise<string> =>
  (await compile(source, { config: { target: jsx({ transforms: [dropUnusedLocals()] }) } })).code;

describe('dropUnusedLocals', () => {
  it('drops an unused className array local', async () => {
    const code = await wrap(`const x = ['a', 'b'];\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });

  it('keeps a referenced className array local', async () => {
    const code = await wrap(`const x = ['a', 'b'];\nfunction App(){ return <Foo className={x}/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused non-array local (conservative)', async () => {
    const code = await wrap(`const x = computeSomething();\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused array with non-pure args (conservative)', async () => {
    const code = await wrap(`const x = ['a', sideEffect()];\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps exported declarations untouched', async () => {
    const code = await wrap(`export const x = ['a', 'b'];\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('export const x');
  });

  it('drops nested array patterns too', async () => {
    const code = await wrap(`const x = ['a', ['b', 'c']];\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });
});
