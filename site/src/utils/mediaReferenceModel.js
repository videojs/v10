/**
 * Centralized media API subsection definitions shared by the renderer and the
 * generated table of contents.
 */

const HTML_SUBSECTIONS = Object.freeze([
  {
    key: 'attributes',
    title: 'Attributes',
    id: 'attributes',
    isEmpty: (html) =>
      (html.attributes?.standard ?? []).length === 0 && Object.keys(html.attributes?.custom ?? {}).length === 0,
  },
  {
    key: 'properties',
    title: 'Properties',
    id: 'properties',
    isEmpty: (html) =>
      Object.keys(html.properties?.definitions ?? {}).length === 0 && (html.properties?.native ?? []).length === 0,
  },
  {
    key: 'methods',
    title: 'Methods',
    id: 'methods',
    isEmpty: (html) => (html.methods ?? []).length === 0,
  },
  {
    key: 'events',
    title: 'Events',
    id: 'events',
    isEmpty: (html) => (html.events?.standard ?? []).length === 0 && (html.events?.custom ?? []).length === 0,
  },
  {
    key: 'cssCustomProperties',
    title: 'CSS custom properties',
    id: 'css-custom-properties',
    isEmpty: (html) => Object.keys(html.cssCustomProperties ?? {}).length === 0,
  },
]);

const REACT_SUBSECTIONS = Object.freeze([
  {
    key: 'props',
    title: 'Props',
    id: 'props',
    isEmpty: (react) => !react.acceptsNativeProps && Object.keys(react.props ?? {}).length === 0,
  },
  {
    key: 'ref',
    title: 'Ref',
    id: 'ref',
    isEmpty: () => false,
  },
  {
    key: 'events',
    title: 'Events',
    id: 'events',
    isEmpty: (react) => !react.acceptsNativeProps,
  },
]);

function createSections(definitions, source) {
  return definitions.flatMap((definition) => {
    if (definition.isEmpty(source)) return [];
    return [
      {
        key: definition.key,
        title: definition.title,
        id: definition.id,
        depth: 3,
      },
    ];
  });
}

export function createMediaReferenceModel(mediaName, ref) {
  if (!ref) return null;

  return {
    mediaName,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    platforms: {
      html: {
        sections: createSections(HTML_SUBSECTIONS, ref.platforms.html),
        data: ref.platforms.html,
      },
      ...(ref.platforms.react
        ? {
            react: {
              sections: createSections(REACT_SUBSECTIONS, ref.platforms.react),
              data: ref.platforms.react,
            },
          }
        : {}),
    },
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

  for (const framework of ['html', 'react']) {
    const platform = model.platforms[framework];
    if (!platform) continue;
    for (const section of platform.sections) {
      headings.push({
        depth: section.depth,
        text: section.title,
        slug: section.id,
        frameworks: [framework],
      });
    }
  }

  return headings;
}
