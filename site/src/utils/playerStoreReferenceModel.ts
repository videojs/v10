/**
 * Whole-store overview built from the generated feature and preset references.
 *
 * Produces the data and heading ids consumed by both PlayerStoreReference.astro and satteriConditionalHeadings, so the
 * page and its table of contents come from the same source as each feature's own reference page.
 *
 * Structure:
 *
 * ## Features by preset (H2) — which preset feature bundles include each feature
 *
 * ## State and actions (H2)
 *
 * ### `{name}Feature` (H3) — one per feature, in name order
 */

import { kebabCase } from 'es-toolkit/string';

import type { FeatureReference } from '@/types/feature-reference';
import type { PresetReference } from '@/types/preset-reference';

import type { TocHeading } from './componentReferenceModel';

/** Presets listed first, in this order; the rest follow by name. Matches PresetReference.astro. */
const PINNED_PRESETS = ['video', 'audio'];

export interface PlayerStorePreset {
  name: string;
  featureBundle: string;
}

export interface PlayerStoreFeature {
  name: string;
  exportName: string;
  /** Heading id of the feature's section on the overview page. */
  id: string;
  docsSlug: string;
  /** Names of the presets whose feature bundle includes the feature, in preset column order. */
  presets: string[];
  state: FeatureReference['state'];
  actions: FeatureReference['actions'];
}

export interface PlayerStoreReferenceModel {
  headings: {
    presets: { id: string; depth: number; text: string };
    features: { id: string; depth: number; text: string };
  };
  presets: PlayerStorePreset[];
  features: PlayerStoreFeature[];
}

function comparePresets(a: PresetReference, b: PresetReference): number {
  const aPin = PINNED_PRESETS.indexOf(a.name);
  const bPin = PINNED_PRESETS.indexOf(b.name);
  if (aPin !== -1 && bPin !== -1) return aPin - bPin;

  if (aPin !== -1) return -1;

  if (bPin !== -1) return 1;

  return a.name.localeCompare(b.name);
}

export function createPlayerStoreReferenceModel(
  features: FeatureReference[],
  presets: PresetReference[]
): PlayerStoreReferenceModel {
  // A preset with an empty bundle contributes nothing to the store, so it gets no column.
  const presetColumns = presets.filter((preset) => preset.features.length > 0).sort(comparePresets);

  return {
    headings: {
      presets: { id: 'features-by-preset', depth: 2, text: 'Features by preset' },
      features: { id: 'state-and-actions', depth: 2, text: 'State and actions' },
    },
    presets: presetColumns.map(({ name, featureBundle }) => ({ name, featureBundle })),
    features: [...features]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((feature) => {
        const exportName = `${feature.name}Feature`;

        return {
          name: feature.name,
          exportName,
          id: kebabCase(exportName),
          docsSlug: feature.docsSlug,
          presets: presetColumns
            .filter((preset) => preset.features.some((included) => included.name === feature.name))
            .map((preset) => preset.name),
          state: feature.state,
          actions: feature.actions,
        };
      }),
  };
}

export function buildPlayerStoreReferenceTocHeadings(model: PlayerStoreReferenceModel): TocHeading[] {
  const { presets, features } = model.headings;

  return [
    { depth: presets.depth, text: presets.text, slug: presets.id },
    { depth: features.depth, text: features.text, slug: features.id },
    ...model.features.map((feature) => ({ depth: 3, text: feature.exportName, slug: feature.id })),
  ];
}
