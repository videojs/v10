import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vite-plus/test';

import { collectFunctionDeclarations, findJsxAttribute, findJsxElement, jsxNamePath } from '..';

const source = `
export function Root() {
  function Nested() {
    return <UI.Popover.Root selectedLabel={<span />} />;
  }
  return <Nested />;
}
`;
const ast = parseSync('fixture.tsx', source).program;

describe('collectFunctionDeclarations', () => {
  it('collects nested declarations in source order', () => {
    expect(collectFunctionDeclarations(ast).map((declaration) => declaration.id?.name)).toEqual(['Root', 'Nested']);
  });
});

describe('findJsxElement', () => {
  it('finds member-expression elements by dotted name', () => {
    expect(findJsxElement(ast, 'UI.Popover.Root')).toBeDefined();
  });
});

describe('findJsxAttribute', () => {
  it('finds named attributes on JSX elements', () => {
    const element = findJsxElement(ast, 'UI.Popover.Root');

    expect(element && findJsxAttribute(element, 'selectedLabel')?.name).toMatchObject({
      type: 'JSXIdentifier',
      name: 'selectedLabel',
    });
  });
});

describe('jsxNamePath', () => {
  it('reads member-expression names as paths', () => {
    const element = findJsxElement(ast, 'UI.Popover.Root');

    expect(element && jsxNamePath(element.openingElement.name)).toEqual(['UI', 'Popover', 'Root']);
  });
});
