import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { jsx } from '../../config';
import { dropUnusedImports } from '../drop-unused-imports';

const wrap = async (source: string): Promise<string> =>
  (await compile(source, { config: { target: jsx({ transforms: [dropUnusedImports()] }) } })).code;

describe('dropUnusedImports', () => {
  it('does not count intrinsic JSX tag names as import references', async () => {
    const code = await wrap(`import { button } from './tokens';
function App(){ return <button type="button"/>; }`);
    expect(code).not.toContain("from './tokens'");
  });

  it('does not count property access names as import references', async () => {
    const code = await wrap(`import { badge } from './tokens';
function App({ option }){ return <span>{option.badge}</span>; }`);
    expect(code).not.toContain("from './tokens'");
  });

  it('does not count destructuring property names as import references', async () => {
    const code = await wrap(`import { poster } from './tokens';
function App(props){ const { poster: posterProp } = props; return <img src={posterProp}/>; }`);
    expect(code).not.toContain("from './tokens'");
  });

  it('keeps component JSX tag imports', async () => {
    const code = await wrap(`import { Menu } from './menu';
function App(){ return <Menu.Trigger/>; }`);
    expect(code).toContain('Menu');
  });

  it('keeps property access expression roots', async () => {
    const code = await wrap(`import { slider } from './tokens';
function App(){ return <div className={slider.fill}/>; }`);
    expect(code).toContain('slider');
  });
});
