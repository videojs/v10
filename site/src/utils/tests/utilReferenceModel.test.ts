import { describe, expect, it } from 'vitest';
import type { UtilReference } from '@/types/util-reference';
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
    } as UtilReference;

    const model = createUtilReferenceModel('useMedia', ref);

    expect(model).not.toBeNull();
    if (!model) return;
    if (model.isMultiOverload) return;

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
    } as UtilReference;

    const model = createUtilReferenceModel('useButton', ref);

    expect(model).not.toBeNull();
    if (!model) return;
    if (model.isMultiOverload) return;

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
    } as UtilReference;

    const model = createUtilReferenceModel('usePlayer', ref);

    expect(model).not.toBeNull();
    if (!model) return;
    if (!model.isMultiOverload) return;

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
  it('uses label for overload id and heading when present', () => {
    const ref = {
      name: 'createPlayer',
      overloads: [
        {
          label: 'Video',
          parameters: { config: { type: 'VideoConfig', required: true } },
          returnValue: { type: 'VideoPlayer' },
        },
        {
          label: 'Audio',
          parameters: { config: { type: 'AudioConfig', required: true } },
          returnValue: { type: 'AudioPlayer' },
        },
      ],
    } as UtilReference;

    const model = createUtilReferenceModel('createPlayer', ref);

    expect(model).not.toBeNull();
    if (!model) return;
    if (!model.isMultiOverload) return;

    expect(model.isMultiOverload).toBe(true);
    expect(model.overloads[0]).toMatchObject({
      id: 'video',
      label: 'Video',
      index: 1,
      sections: [
        { key: 'parameters', id: 'video-parameters', depth: 4 },
        { key: 'returnValue', id: 'video-return-value', depth: 4 },
      ],
    });
    expect(model.overloads[1]).toMatchObject({
      id: 'audio',
      label: 'Audio',
      index: 2,
      sections: [
        { key: 'parameters', id: 'audio-parameters', depth: 4 },
        { key: 'returnValue', id: 'audio-return-value', depth: 4 },
      ],
    });
  });

  it('falls back to overload-N when label is absent', () => {
    const ref = {
      name: 'useStore',
      overloads: [
        {
          parameters: {},
          returnValue: { type: 'S' },
        },
        {
          label: 'Selector',
          parameters: { selector: { type: 'function', required: true } },
          returnValue: { type: 'R' },
        },
      ],
    } as UtilReference;

    const model = createUtilReferenceModel('useStore', ref);

    expect(model).not.toBeNull();
    if (!model) return;
    if (!model.isMultiOverload) return;

    expect(model.overloads[0]).toMatchObject({ id: 'overload-1', label: undefined });
    expect(model.overloads[1]).toMatchObject({ id: 'selector', label: 'Selector' });
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
    } as UtilReference;

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
    } as UtilReference;

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

  it('uses label text and slug in TOC headings when present', () => {
    const ref = {
      name: 'createPlayer',
      overloads: [
        {
          label: 'Video',
          parameters: { config: { type: 'VideoConfig', required: true } },
          returnValue: { type: 'VideoPlayer' },
        },
        {
          label: 'Audio',
          parameters: { config: { type: 'AudioConfig', required: true } },
          returnValue: { type: 'AudioPlayer' },
        },
      ],
    } as UtilReference;

    const model = createUtilReferenceModel('createPlayer', ref);
    const headings = buildUtilReferenceTocHeadings(model);

    expect(headings).toEqual([
      { depth: 2, text: 'API Reference', slug: 'api-reference' },
      { depth: 3, text: 'Video', slug: 'video' },
      { depth: 4, text: 'Parameters', slug: 'video-parameters' },
      { depth: 4, text: 'Return Value', slug: 'video-return-value' },
      { depth: 3, text: 'Audio', slug: 'audio' },
      { depth: 4, text: 'Parameters', slug: 'audio-parameters' },
      { depth: 4, text: 'Return Value', slug: 'audio-return-value' },
    ]);
  });
});
