/**
 * Whole-store overview built from the generated feature and preset references.
 *
 * Produces the data and heading ids consumed by both PlayerStoreReference.astro and satteriConditionalHeadings, so the
 * page and its table of contents come from the same source as each feature's own reference page.
 *
 * Structure:
 *
 * ## Store shape (H2) — every member as one TypeScript object type, commented by feature
 *
 * ## State and actions (H2) — every member in one table, in feature order
 *
 * ## Features by preset (H2) — which preset feature bundles include each feature
 */

import type { FeatureReference, FeatureStateDef } from '@/types/feature-reference';
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
  docsSlug: string;
  /** Names of the presets whose feature bundle includes the feature, in preset column order. */
  presets: string[];
}

export interface PlayerStoreMember {
  name: string;
  kind: 'state' | 'action';
  /** Display type. Actions show their full signature instead of the abbreviated `function`. */
  type: string;
  description?: string;
  /** Row id, matching the row id on the feature's own reference page. */
  id: string;
  feature: PlayerStoreFeature;
}

interface PlayerStoreHeading {
  id: string;
  depth: number;
  text: string;
}

export interface PlayerStoreReferenceModel {
  headings: {
    storeType: PlayerStoreHeading;
    members: PlayerStoreHeading;
    presets: PlayerStoreHeading;
  };
  presets: PlayerStorePreset[];
  features: PlayerStoreFeature[];
  members: PlayerStoreMember[];
  /** Every member as one TypeScript object type, grouped and commented by feature. */
  storeType: string;
}

function comparePresets(a: PresetReference, b: PresetReference): number {
  const aPin = PINNED_PRESETS.indexOf(a.name);
  const bPin = PINNED_PRESETS.indexOf(b.name);
  if (aPin !== -1 && bPin !== -1) return aPin - bPin;

  if (aPin !== -1) return -1;

  if (bPin !== -1) return 1;

  return a.name.localeCompare(b.name);
}

function toMembers(
  feature: PlayerStoreFeature,
  kind: PlayerStoreMember['kind'],
  defs: Record<string, FeatureStateDef>
): PlayerStoreMember[] {
  return Object.entries(defs).map(([name, def]) => {
    const member: PlayerStoreMember = {
      name,
      kind,
      type: kind === 'action' ? (def.detailedType ?? def.type) : def.type,
      id: `${feature.name}-${kind}-${name}`,
      feature,
    };

    if (def.description) member.description = def.description;

    return member;
  });
}

function formatStoreType(features: PlayerStoreFeature[], members: PlayerStoreMember[]): string {
  const groups = features.map((feature) => {
    const presets = feature.presets.length > 0 ? feature.presets.join(', ') : 'opt-in';
    const lines = members
      .filter((member) => member.feature === feature)
      .map((member) => `  ${member.kind === 'state' ? 'readonly ' : ''}${member.name}: ${member.type};`);

    return [`  // ${feature.exportName} (${presets})`, ...lines].join('\n');
  });

  return `{\n${groups.join('\n\n')}\n}`;
}

export function createPlayerStoreReferenceModel(
  featureRefs: FeatureReference[],
  presetRefs: PresetReference[]
): PlayerStoreReferenceModel {
  // A preset with an empty bundle contributes nothing to the store, so it gets no column.
  const presetColumns = presetRefs.filter((preset) => preset.features.length > 0).sort(comparePresets);
  const sortedRefs = [...featureRefs].sort((a, b) => a.name.localeCompare(b.name));
  const features: PlayerStoreFeature[] = [];
  const members: PlayerStoreMember[] = [];

  for (const ref of sortedRefs) {
    const feature: PlayerStoreFeature = {
      name: ref.name,
      exportName: `${ref.name}Feature`,
      docsSlug: ref.docsSlug,
      presets: presetColumns
        .filter((preset) => preset.features.some((included) => included.name === ref.name))
        .map((preset) => preset.name),
    };

    features.push(feature);
    members.push(...toMembers(feature, 'state', ref.state), ...toMembers(feature, 'action', ref.actions));
  }

  return {
    headings: {
      storeType: { id: 'store-shape', depth: 2, text: 'Store shape' },
      members: { id: 'state-and-actions', depth: 2, text: 'State and actions' },
      presets: { id: 'features-by-preset', depth: 2, text: 'Features by preset' },
    },
    presets: presetColumns.map(({ name, featureBundle }) => ({ name, featureBundle })),
    features,
    members,
    storeType: formatStoreType(features, members),
  };
}

export function buildPlayerStoreReferenceTocHeadings(model: PlayerStoreReferenceModel): TocHeading[] {
  const { storeType, members, presets } = model.headings;

  return [storeType, members, presets].map(({ depth, text, id }) => ({ depth, text, slug: id }));
}
