/**
 * Centralized component API subsection definitions.
 *
 * Why this exists:
 * API reference headings are produced in two different places:
 * 1) rendered markup in ComponentReference.astro
 * 2) synthetic TOC metadata in remarkConditionalHeadings
 *
 * Historically each side computed ids/slugs independently, which caused drift
 * (TOC links diverging from rendered heading ids). Keeping subsection shape and
 * id pieces here makes both sides consume the same contract.
 */
const API_REFERENCE_SUBSECTIONS = Object.freeze([
  {
    key: 'props',
    title: 'Props',
    singleId: 'props',
    suffix: 'props',
  },
  {
    key: 'state',
    title: 'State',
    singleId: 'state',
    suffix: 'state',
  },
  {
    key: 'dataAttributes',
    title: 'Data attributes',
    singleId: 'data-attributes',
    suffix: 'data-attributes',
  },
]);

export const API_REFERENCE_SUBSECTION_TITLES = Object.freeze(API_REFERENCE_SUBSECTIONS.map((section) => section.title));

function hasEntries(value) {
  return Object.keys(value ?? {}).length > 0;
}

function createSections(source, options) {
  return API_REFERENCE_SUBSECTIONS.flatMap((definition) => {
    if (!hasEntries(source[definition.key])) {
      return [];
    }

    if (options.forPart) {
      return [
        {
          key: definition.key,
          title: definition.title,
          id: `${options.partId}-${definition.suffix}`,
          depth: 4,
          tocKind: 'api-reference-subsection',
        },
      ];
    }

    return [
      {
        key: definition.key,
        title: definition.title,
        id: definition.singleId,
        depth: 3,
      },
    ];
  });
}

/**
 * Create a single source-of-truth model for API reference headings and sections.
 *
 * This model intentionally carries both:
 * - display concerns (heading text/depth/framework label)
 * - identity concerns (exact ids used by anchors + TOC entries)
 *
 * The shared model is what prevents anchor drift: ids are computed once and
 * reused verbatim by the renderer and the remark plugin.
 */
export function createComponentReferenceModel(componentName, apiReference) {
  if (!apiReference) {
    return null;
  }

  const hasParts = Boolean(apiReference.parts && Object.keys(apiReference.parts).length > 0);

  if (hasParts) {
    const parts = Object.entries(apiReference.parts).map(([partId, part]) => ({
      id: partId,
      name: part.name,
      description: part.description,
      componentName: `${componentName}.${part.name}`,
      labelByFramework: {
        react: part.name,
        html: part.platforms?.html?.tagName ?? part.name,
      },
      sections: createSections(part, { forPart: true, partId }),
      data: part,
    }));

    return {
      componentName,
      hasParts: true,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      sections: [],
      parts,
      data: apiReference,
    };
  }

  return {
    componentName,
    hasParts: false,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    sections: createSections(apiReference, { forPart: false }),
    parts: [],
    data: apiReference,
  };
}

/**
 * Build TOC heading metadata from the shared API reference model.
 *
 * Important: this function does not slugify heading text. It uses model ids
 * directly, so TOC slugs are guaranteed to match rendered heading ids.
 */
export function buildComponentReferenceTocHeadings(apiReferenceModel) {
  if (!apiReferenceModel) {
    return [];
  }

  const headings = [
    {
      depth: apiReferenceModel.heading.depth,
      text: apiReferenceModel.heading.text,
      slug: apiReferenceModel.heading.id,
    },
  ];

  if (apiReferenceModel.hasParts) {
    for (const part of apiReferenceModel.parts) {
      headings.push({
        depth: 3,
        text: part.labelByFramework.react,
        slug: part.id,
        frameworks: ['react'],
      });
      headings.push({
        depth: 3,
        text: part.labelByFramework.html,
        slug: part.id,
        frameworks: ['html'],
      });

      for (const section of part.sections) {
        headings.push({
          depth: section.depth,
          text: section.title,
          slug: section.id,
          tocKind: section.tocKind,
        });
      }
    }

    return headings;
  }

  for (const section of apiReferenceModel.sections) {
    headings.push({
      depth: section.depth,
      text: section.title,
      slug: section.id,
    });
  }

  return headings;
}
