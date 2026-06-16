import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { dropUnusedLocals } from '../drop-unused-locals';

const wrap = (source: string): string => compile(source, { target: 'react', plugins: [dropUnusedLocals()] }).code;

describe('dropUnusedLocals', () => {
  it('drops an unused cn() local', () => {
    const code = wrap(`const x = cn('a', 'b');\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });

  it('keeps a referenced cn() local', () => {
    const code = wrap(`const x = cn('a', 'b');\nfunction App(){ return <Foo className={x}/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused non-cn() local (conservative)', () => {
    const code = wrap(`const x = computeSomething();\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps an unused cn() with non-pure args (conservative)', () => {
    const code = wrap(`const x = cn('a', sideEffect());\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('const x =');
  });

  it('keeps exported declarations untouched', () => {
    const code = wrap(`export const x = cn('a', 'b');\nfunction App(){ return <Foo/>; }`);
    expect(code).toContain('export const x');
  });

  it('drops nested cn() arg patterns too', () => {
    const code = wrap(`const x = cn('a', cn('b', 'c'));\nfunction App(){ return <Foo/>; }`);
    expect(code).not.toContain('const x =');
  });
});
