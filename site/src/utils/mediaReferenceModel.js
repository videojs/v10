/** Centralized media API subsection definitions shared by the renderer and the generated table of contents. */

/**
 * Options under `source.engine`, shared by both platforms: the structured source has the same shape in HTML and React,
 * so the section is defined once and placed after the properties or props it extends.
 */
const ENGINE_OPTIONS_SUBSECTION = Object.freeze({
  key: 'engineOptions',
  title: 'Engine options',
  id: 'engine-options',
  isEmpty: (_platform, ref) => Object.keys(ref.engineOptions ?? {}).length === 0,
});

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
  ENGINE_OPTIONS_SUBSECTION,
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
  ENGINE_OPTIONS_SUBSECTION,
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

function createSections(definitions, source, ref) {
  return definitions.flatMap((definition) => {
    if (definition.isEmpty(source, ref)) return [];

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

/**
 * One entry per engine under `source.engine`, in the order the generator emitted them. Ids are lowercased so `hlsJs`
 * and `nativeHls` anchor predictably; titles are the exact path a reader types.
 */
function createEngines(ref) {
  return Object.keys(ref.engineOptions ?? {}).map((key) => ({
    key,
    id: `engine-options-${key.toLowerCase()}`,
    title: `source.engine.${key}`,
  }));
}

export function createMediaReferenceModel(mediaName, ref) {
  if (!ref) return null;

  const engines = createEngines(ref);

  return {
    mediaName,
    engines,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    platforms: {
      html: {
        sections: createSections(HTML_SUBSECTIONS, ref.platforms.html, ref),
        data: ref.platforms.html,
      },
      ...(ref.platforms.react
        ? {
            react: {
              sections: createSections(REACT_SUBSECTIONS, ref.platforms.react, ref),
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

      if (section.key === 'engineOptions') {
        for (const engine of model.engines) {
          headings.push({
            depth: section.depth + 1,
            text: engine.title,
            slug: engine.id,
            frameworks: [framework],
          });
        }
      }
    }
  }

  return headings;
}
