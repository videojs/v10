import { describe, expect, it } from 'vitest';
import { compile } from '../../compile';
import { rewriteStyleAttribute, type StyleAttributeInfo } from '../analyze';
import { classNameScanner, defineStylingPlugin, isClassNameStyleReference, styling } from '../pipeline';

describe('styling pipeline', () => {
  it('scans, resolves, and transforms style references', async () => {
    const { code } = await compile(`function App(){ return <Button className="one"/>; }`, {
      config: {
        plugins: [
          styling({
            plugins: [
              classNameScanner(),
              defineStylingPlugin({
                name: 'rewrite-class-name',
                resolve(reference) {
                  if (!isClassNameStyleReference(reference)) return null;
                  return { kind: 'rewrite-class-name', reference, data: reference.data.info };
                },
                transform(resolution, context) {
                  if (resolution.kind !== 'rewrite-class-name') return null;
                  return {
                    element: rewriteStyleAttribute(
                      resolution.data as StyleAttributeInfo,
                      context.factory.createStringLiteral('two'),
                      context.factory
                    ),
                  };
                },
              }),
            ],
          }),
        ],
      },
    });

    expect(code).toContain('className="two"');
  });

  it('uses the first renderer that returns assets', async () => {
    const { assets } = await compile(`function App(){ return <Button/>; }`, {
      config: {
        plugins: [
          styling({
            plugins: [
              defineStylingPlugin({
                name: 'empty-renderer',
                render() {
                  return null;
                },
              }),
              defineStylingPlugin({
                name: 'asset-renderer',
                render() {
                  return [{ type: 'css', fileName: 'styles.css', source: '.button { display: flex; }' }];
                },
              }),
              defineStylingPlugin({
                name: 'unused-renderer',
                render() {
                  return [{ type: 'css', fileName: 'unused.css', source: '.unused {}' }];
                },
              }),
            ],
          }),
        ],
      },
    });

    expect(assets).toEqual([{ type: 'css', fileName: 'styles.css', source: '.button { display: flex; }' }]);
  });
});
