/**
 * Centralized feature API reference subsection definitions.
 *
 * Mirrors componentReferenceModel.ts for feature APIs. Produces heading/id data consumed by both FeatureReference.astro
 * and satteriConditionalHeadings.
 *
 * Structure:
 *
 * ## API Reference (H2)
 *
 * ### Configuration (H3) — if feature declares provider inputs
 *
 * ### State (H3) — if feature has state properties
 *
 * ### Actions (H3) — if feature has action methods
 *
 * Configuration leads, mirroring props-before-state in componentReferenceModel: inputs first, then what the store
 * publishes back.
 */

import type { FeatureReference } from '@/types/feature-reference';

import type { TocHeading } from './componentReferenceModel';

type FeatureReferenceSectionKey = 'config' | 'state' | 'actions';

export interface FeatureReferenceSection {
  key: FeatureReferenceSectionKey;
  title: string;
  id: string;
  depth: number;
}

export interface FeatureReferenceModel {
  name: string;
  description: FeatureReference['description'];
  heading: { id: string; depth: number; text: string };
  sections: FeatureReferenceSection[];
  data: FeatureReference;
}

type FeatureEntries = FeatureReference['config'] | FeatureReference['state'] | FeatureReference['actions'];

function hasEntries(value: FeatureEntries): boolean {
  return Object.keys(value).length > 0;
}

export function createFeatureReferenceModel(name: string, ref: FeatureReference | null): FeatureReferenceModel | null {
  if (!ref) return null;

  const sections: FeatureReferenceSection[] = [];

  if (hasEntries(ref.config)) {
    sections.push({ key: 'config', title: 'Configuration', id: 'configuration', depth: 3 });
  }

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

export function buildFeatureReferenceTocHeadings(model: FeatureReferenceModel | null): TocHeading[] {
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
