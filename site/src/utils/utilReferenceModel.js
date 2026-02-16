/**
 * Centralized util API subsection definitions.
 *
 * Mirrors componentReferenceModel.js for utility APIs (hooks, controllers,
 * mixins, factories, contexts, utilities). Produces heading/id data consumed
 * by both UtilReference.astro and remarkConditionalHeadings.
 */

/**
 * Create a single source-of-truth model for util reference headings and sections.
 *
 * Single-overload: Parameters (H3) + Return Value (H3)
 * Multi-overload:  Overload N (H3) → Parameters (H4) + Return Value (H4)
 */
export function createUtilReferenceModel(name, ref) {
  if (!ref) {
    return null;
  }

  const isMultiOverload = ref.overloads.length > 1;

  if (isMultiOverload) {
    const overloads = ref.overloads.map((overload, index) => {
      const overloadId = `overload-${index + 1}`;
      const sections = [];

      if (Object.keys(overload.parameters).length > 0) {
        sections.push({
          key: 'parameters',
          title: 'Parameters',
          id: `${overloadId}-parameters`,
          depth: 4,
        });
      }

      sections.push({
        key: 'returnValue',
        title: 'Return Value',
        id: `${overloadId}-return-value`,
        depth: 4,
      });

      return {
        id: overloadId,
        index: index + 1,
        description: overload.description,
        sections,
        data: overload,
      };
    });

    return {
      name,
      kind: ref.kind,
      description: ref.description,
      isMultiOverload: true,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      overloads,
    };
  }

  const overload = ref.overloads[0];
  const sections = [];

  if (Object.keys(overload.parameters).length > 0) {
    sections.push({
      key: 'parameters',
      title: 'Parameters',
      id: 'parameters',
      depth: 3,
    });
  }

  sections.push({
    key: 'returnValue',
    title: 'Return Value',
    id: 'return-value',
    depth: 3,
  });

  return {
    name,
    kind: ref.kind,
    description: ref.description,
    isMultiOverload: false,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    sections,
    overload,
  };
}

/**
 * Build TOC heading metadata from the shared util reference model.
 */
export function buildUtilReferenceTocHeadings(model) {
  if (!model) {
    return [];
  }

  const headings = [
    {
      depth: model.heading.depth,
      text: model.heading.text,
      slug: model.heading.id,
    },
  ];

  if (model.isMultiOverload) {
    for (const overload of model.overloads) {
      headings.push({
        depth: 3,
        text: `Overload ${overload.index}`,
        slug: overload.id,
      });

      for (const section of overload.sections) {
        headings.push({
          depth: section.depth,
          text: section.title,
          slug: section.id,
        });
      }
    }

    return headings;
  }

  for (const section of model.sections) {
    headings.push({
      depth: section.depth,
      text: section.title,
      slug: section.id,
    });
  }

  return headings;
}
