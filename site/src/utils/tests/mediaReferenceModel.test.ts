// @ts-nocheck — the model is plain JS shared with remarkConditionalHeadings
import { describe, expect, it } from 'vitest';
import { buildMediaReferenceTocHeadings, createMediaReferenceModel } from '../mediaReferenceModel';

function makeRef(overrides = {}) {
  return {
    name: 'HlsVideo',
    tagName: 'hls-video',
    hostProperties: {
      src: { type: 'string', readonly: false },
      streamType: { type: 'string', readonly: true },
    },
    nativeAttributes: ['src', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'poster'],
    nativeProperties: ['currentTime', 'duration', 'volume'],
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
    expect(createMediaReferenceModel('HlsVideo', null)).toBeNull();
  });

  it('titles the attributes section "Attributes"', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef());
    const attrs = model.sections.find((s) => s.key === 'nativeAttributes');
    expect(attrs).toMatchObject({ title: 'Attributes', id: 'attributes' });
  });

  it('titles the properties section "Properties"', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef());
    const props = model.sections.find((s) => s.key === 'hostProperties');
    expect(props).toMatchObject({ title: 'Properties', id: 'properties' });
  });

  it('drops the properties section only when both host and native properties are empty', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef({ hostProperties: {}, nativeProperties: [] }));
    const keys = model.sections.map((s) => s.key);
    expect(keys).not.toContain('hostProperties');
  });

  it('keeps the properties section when only native properties exist', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef({ hostProperties: {} }));
    expect(model.sections.some((s) => s.key === 'hostProperties')).toBe(true);
  });

  it('keeps the events section when only native events exist', () => {
    const model = createMediaReferenceModel(
      'DashVideo',
      makeRef({ events: { native: ['play'], elementSpecific: [] } })
    );
    expect(model.sections.some((s) => s.key === 'events')).toBe(true);
  });

  it('orders sections markup-first: attributes, properties, methods, events, css', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef());
    const keys = model.sections.map((s) => s.key);
    expect(keys).toEqual(['nativeAttributes', 'hostProperties', 'methods', 'events', 'cssCustomProperties']);
  });

  it('includes a methods section between properties and events when methods exist', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef());
    const keys = model.sections.map((s) => s.key);
    expect(keys).toContain('methods');
    expect(keys.indexOf('methods')).toBeGreaterThan(keys.indexOf('hostProperties'));
    expect(keys.indexOf('methods')).toBeLessThan(keys.indexOf('events'));
    const methods = model.sections.find((s) => s.key === 'methods');
    expect(methods).toMatchObject({ title: 'Methods', id: 'methods' });
  });

  it('drops the methods section when there are no methods', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef({ methods: [] }));
    expect(model.sections.some((s) => s.key === 'methods')).toBe(false);
  });
});

describe('buildMediaReferenceTocHeadings', () => {
  it('returns empty for a null model', () => {
    expect(buildMediaReferenceTocHeadings(null)).toEqual([]);
  });

  it('emits the API Reference heading followed by section headings', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef());
    const headings = buildMediaReferenceTocHeadings(model);
    expect(headings[0]).toEqual({ depth: 2, text: 'API Reference', slug: 'api-reference' });
    expect(headings).toContainEqual({ depth: 3, text: 'Attributes', slug: 'attributes' });
  });
});
