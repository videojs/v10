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
    title: 'Native Attributes',
    id: 'native-attributes',
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
