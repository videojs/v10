/**
 * Centralized media element API subsection definitions.
 *
 * Mirrors componentReferenceModel.js for media elements. Produces heading/id
 * data consumed by both MediaReference.astro and remarkConditionalHeadings.
 */

const MEDIA_REFERENCE_SUBSECTIONS = Object.freeze([
  {
    key: 'hostProperties',
    title: 'Host Properties',
    id: 'host-properties',
    isEmpty: (ref) => Object.keys(ref.hostProperties ?? {}).length === 0,
  },
  {
    key: 'nativeAttributes',
    title: 'Attributes',
    id: 'attributes',
    isEmpty: (ref) => (ref.nativeAttributes ?? []).length === 0,
  },
  {
    key: 'events',
    title: 'Events',
    id: 'events',
    isEmpty: (ref) => (ref.events?.native ?? []).length === 0 && (ref.events?.elementSpecific ?? []).length === 0,
  },
  {
    key: 'cssCustomProperties',
    title: 'CSS Custom Properties',
    id: 'css-custom-properties',
    isEmpty: (ref) => Object.keys(ref.cssCustomProperties ?? {}).length === 0,
  },
  {
    key: 'slots',
    title: 'Slots',
    id: 'slots',
    isEmpty: (ref) => (ref.slots ?? []).length === 0,
  },
]);

/**
 * Native attributes worth calling out in the attributes prose, in display
 * order. Per-element output is filtered against the generated reference so
 * the docs never claim support the data doesn't back.
 */
const CURATED_ATTRIBUTE_EXAMPLES = Object.freeze([
  'src',
  'controls',
  'autoplay',
  'muted',
  'loop',
  'playsinline',
  'poster',
  'preload',
]);

/**
 * Curated attribute examples present on this element. Checks both
 * `nativeAttributes` and host property names — `src`/`preload` are
 * deduplicated out of `nativeAttributes` when the host owns them, but they
 * remain attribute-settable.
 */
export function getAttributeExamples(ref) {
  const available = new Set([
    ...(ref.nativeAttributes ?? []),
    ...Object.keys(ref.hostProperties ?? {}).map((name) => name.toLowerCase()),
  ]);
  return CURATED_ATTRIBUTE_EXAMPLES.filter((attr) => available.has(attr));
}

export function createMediaReferenceModel(mediaName, ref) {
  if (!ref) return null;

  const sections = MEDIA_REFERENCE_SUBSECTIONS.flatMap((definition) => {
    if (definition.isEmpty(ref)) return [];
    return [
      {
        key: definition.key,
        title: definition.title,
        id: definition.id,
        depth: 3,
      },
    ];
  });

  return {
    mediaName,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    sections,
    data: ref,
  };
}

export function buildMediaReferenceTocHeadings(model) {
  if (!model) return [];

  const headings = [
    {
      depth: model.heading.depth,
      text: model.heading.text,
      slug: model.heading.id,
    },
  ];

  for (const section of model.sections) {
    headings.push({
      depth: section.depth,
      text: section.title,
      slug: section.id,
    });
  }

  return headings;
}
