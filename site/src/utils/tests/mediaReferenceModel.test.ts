// @ts-nocheck — the model is plain JS shared with satteriConditionalHeadings
import { describe, expect, it } from 'vitest';
import { buildMediaReferenceTocHeadings, createMediaReferenceModel } from '../mediaReferenceModel';

function makeRef(overrides = {}) {
  return {
    name: 'HlsJsVideo',
    tagName: 'hlsjs-video',
    hostProperties: {
      src: { type: 'string', readonly: false },
      streamType: { type: 'string', readonly: true },
    },
    nativeAttributes: ['src', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'poster'],
    events: {
      native: ['play', 'pause'],
      elementSpecific: [{ name: 'streamtypechange', description: 'Fired when the stream type changes.' }],
    },
    methods: ['canPlayType', 'load', 'pause', 'play', 'requestFullscreen'],
    cssCustomProperties: { '--media-object-fit': { description: 'Object fit.' } },
    ...overrides,
  };
}

describe('createMediaReferenceModel', () => {
  it('returns null without a reference', () => {
    expect(createMediaReferenceModel('HlsJsVideo', null)).toBeNull();
  });

  it('titles the attributes section "Attributes"', () => {
    const model = createMediaReferenceModel('HlsJsVideo', makeRef());
    const attrs = model.sections.find((s) => s.key === 'nativeAttributes');
    expect(attrs).toMatchObject({ title: 'Attributes', id: 'attributes' });
  });

  it('drops sections with no data', () => {
    const model = createMediaReferenceModel('HlsJsVideo', makeRef({ hostProperties: {} }));
    const keys = model.sections.map((s) => s.key);
    expect(keys).not.toContain('hostProperties');
  });

  it('keeps the events section when only native events exist', () => {
    const model = createMediaReferenceModel(
      'DashVideo',
      makeRef({ events: { native: ['play'], elementSpecific: [] } })
    );
    expect(model.sections.some((s) => s.key === 'events')).toBe(true);
  });

  it('includes a methods section after events when methods exist', () => {
    const model = createMediaReferenceModel('HlsJsVideo', makeRef());
    const keys = model.sections.map((s) => s.key);
    expect(keys).toContain('methods');
    expect(keys.indexOf('methods')).toBeGreaterThan(keys.indexOf('events'));
    expect(keys.indexOf('methods')).toBeLessThan(keys.indexOf('cssCustomProperties'));
    const methods = model.sections.find((s) => s.key === 'methods');
    expect(methods).toMatchObject({ title: 'Methods', id: 'methods' });
  });

  it('drops the methods section when there are no methods', () => {
    const model = createMediaReferenceModel('HlsJsVideo', makeRef({ methods: [] }));
    expect(model.sections.some((s) => s.key === 'methods')).toBe(false);
  });
});

describe('buildMediaReferenceTocHeadings', () => {
  it('returns empty for a null model', () => {
    expect(buildMediaReferenceTocHeadings(null)).toEqual([]);
  });

  it('emits the API Reference heading followed by section headings', () => {
    const model = createMediaReferenceModel('HlsJsVideo', makeRef());
    const headings = buildMediaReferenceTocHeadings(model);
    expect(headings[0]).toEqual({ depth: 2, text: 'API Reference', slug: 'api-reference' });
    expect(headings).toContainEqual({ depth: 3, text: 'Attributes', slug: 'attributes' });
  });
});
