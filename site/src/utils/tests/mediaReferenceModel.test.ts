// @ts-nocheck — the model is plain JS shared with remarkConditionalHeadings
import { describe, expect, it } from 'vitest';
import {
  buildMediaReferenceTocHeadings,
  createMediaReferenceModel,
  getAttributeExamples,
} from '../mediaReferenceModel';

function makeRef(overrides = {}) {
  return {
    name: 'HlsVideo',
    tagName: 'hls-video',
    hostProperties: {
      src: { type: 'string', readonly: false },
      streamType: { type: 'string', readonly: true },
    },
    nativeAttributes: ['autoplay', 'controls', 'loop', 'muted', 'playsinline', 'poster'],
    events: {
      native: ['play', 'pause'],
      elementSpecific: [{ name: 'streamtypechange', description: 'Fired when the stream type changes.' }],
    },
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

  it('drops sections with no data', () => {
    const model = createMediaReferenceModel('HlsVideo', makeRef({ hostProperties: {} }));
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
});

describe('getAttributeExamples', () => {
  it('filters the curated list against the generated attributes', () => {
    const examples = getAttributeExamples(makeRef({ hostProperties: {} }));
    // src/preload are not in nativeAttributes or hostProperties → dropped.
    expect(examples).not.toContain('src');
    expect(examples).not.toContain('preload');
    expect(examples).toContain('controls');
  });

  it('includes attributes backed by host properties (deduplicated src/preload)', () => {
    // src is deduplicated out of nativeAttributes because the host owns it,
    // but it remains attribute-settable — the prose must still mention it.
    const examples = getAttributeExamples(makeRef());
    expect(examples).toContain('src');
  });

  it('preserves curated display order regardless of input order', () => {
    const examples = getAttributeExamples(
      makeRef({ nativeAttributes: ['poster', 'autoplay', 'controls', 'muted', 'loop', 'playsinline'] })
    );
    expect(examples).toEqual(['src', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'poster']);
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
