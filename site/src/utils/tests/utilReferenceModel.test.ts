import { describe, expect, it } from 'vitest';
import { buildUtilReferenceTocHeadings, createUtilReferenceModel } from '../utilReferenceModel';

describe('createUtilReferenceModel', () => {
  it('returns null for null input', () => {
    expect(createUtilReferenceModel('foo', null)).toBeNull();
  });

  it('builds a single-overload model with Parameters and Return Value H3s', () => {
    const ref = {
      name: 'useMedia',
      overloads: [
        {
          parameters: {},
          returnValue: { type: 'Media | null' },
        },
      ],
    };

    const model = createUtilReferenceModel('useMedia', ref);

    expect(model).toMatchObject({
      isMultiOverload: false,
      heading: { id: 'api-reference', depth: 2, text: 'API Reference' },
      sections: [{ key: 'returnValue', title: 'Return Value', id: 'return-value', depth: 3 }],
    });
    // No parameters section since parameters is empty
    expect(model.sections.find((s) => s.key === 'parameters')).toBeUndefined();
  });

  it('includes parameters section when parameters are present', () => {
    const ref = {
      name: 'useButton',
      overloads: [
        {
          parameters: {
            params: { type: 'UseButtonParameters', required: true },
          },
          returnValue: { type: 'UseButtonReturnValue' },
        },
      ],
    };

    const model = createUtilReferenceModel('useButton', ref);

    expect(model.isMultiOverload).toBe(false);
    expect(model.sections).toEqual([
      { key: 'parameters', title: 'Parameters', id: 'parameters', depth: 3 },
      { key: 'returnValue', title: 'Return Value', id: 'return-value', depth: 3 },
    ]);
  });

  it('builds a multi-overload model with overload H3s and H4 subsections', () => {
    const ref = {
      name: 'usePlayer',
      overloads: [
        {
          description: 'Returns the store. No subscription.',
          parameters: {},
          returnValue: { type: 'PlayerStore' },
        },
        {
          description: 'Returns selected state.',
          parameters: {
            selector: { type: '(state: StoreState) => R', required: true },
          },
          returnValue: { type: 'R' },
        },
      ],
    };

    const model = createUtilReferenceModel('usePlayer', ref);

    expect(model.isMultiOverload).toBe(true);
    expect(model.overloads).toHaveLength(2);

    // Overload 1: no parameters, only return value
    expect(model.overloads[0]).toMatchObject({
      id: 'overload-1',
      index: 1,
      sections: [{ key: 'returnValue', id: 'overload-1-return-value', depth: 4 }],
    });

    // Overload 2: has parameters and return value
    expect(model.overloads[1]).toMatchObject({
      id: 'overload-2',
      index: 2,
      sections: [
        { key: 'parameters', id: 'overload-2-parameters', depth: 4 },
        { key: 'returnValue', id: 'overload-2-return-value', depth: 4 },
      ],
    });
  });
});

describe('buildUtilReferenceTocHeadings', () => {
  it('returns empty array for null model', () => {
    expect(buildUtilReferenceTocHeadings(null)).toEqual([]);
  });

  it('creates TOC headings for single-overload model', () => {
    const ref = {
      name: 'useButton',
      overloads: [
        {
          parameters: { params: { type: 'UseButtonParameters', required: true } },
          returnValue: { type: 'UseButtonReturnValue' },
        },
      ],
    };

    const model = createUtilReferenceModel('useButton', ref);
    const headings = buildUtilReferenceTocHeadings(model);

    expect(headings).toEqual([
      { depth: 2, text: 'API Reference', slug: 'api-reference' },
      { depth: 3, text: 'Parameters', slug: 'parameters' },
      { depth: 3, text: 'Return Value', slug: 'return-value' },
    ]);
  });

  it('creates TOC headings for multi-overload model', () => {
    const ref = {
      name: 'useStore',
      overloads: [
        {
          description: 'Store access',
          parameters: { store: { type: 'Store', required: true } },
          returnValue: { type: 'S' },
        },
        {
          description: 'Selector',
          parameters: {
            store: { type: 'Store', required: true },
            selector: { type: 'function', required: true },
          },
          returnValue: { type: 'R' },
        },
      ],
    };

    const model = createUtilReferenceModel('useStore', ref);
    const headings = buildUtilReferenceTocHeadings(model);

    expect(headings).toEqual([
      { depth: 2, text: 'API Reference', slug: 'api-reference' },
      { depth: 3, text: 'Overload 1', slug: 'overload-1' },
      { depth: 4, text: 'Parameters', slug: 'overload-1-parameters' },
      { depth: 4, text: 'Return Value', slug: 'overload-1-return-value' },
      { depth: 3, text: 'Overload 2', slug: 'overload-2' },
      { depth: 4, text: 'Parameters', slug: 'overload-2-parameters' },
      { depth: 4, text: 'Return Value', slug: 'overload-2-return-value' },
    ]);
  });
});
