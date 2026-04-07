/**
 * Centralized feature API reference subsection definitions.
 *
 * Mirrors componentReferenceModel.js for feature APIs. Produces heading/id data
 * consumed by both FeatureReference.astro and remarkConditionalHeadings.
 *
 * Structure:
 *   ## API Reference (H2)
 *   ### State (H3) — if feature has state properties
 *   ### Actions (H3) — if feature has action methods
 */

function hasEntries(value) {
  return Object.keys(value ?? {}).length > 0;
}

export function createFeatureReferenceModel(name, ref) {
  if (!ref) return null;

  const sections = [];

  if (hasEntries(ref.state)) {
    sections.push({ key: 'state', title: 'State', id: 'state', depth: 3 });
  }

  if (hasEntries(ref.actions)) {
    sections.push({ key: 'actions', title: 'Actions', id: 'actions', depth: 3 });
  }

  return {
    name,
    description: ref.description,
    heading: { id: 'api-reference', depth: 2, text: 'API Reference' },
    sections,
    data: ref,
  };
}

export function buildFeatureReferenceTocHeadings(model) {
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
