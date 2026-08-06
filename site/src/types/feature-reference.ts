/**
 * Zod schemas for feature API reference JSON files.
 *
 * FeatureStateDef and FeatureActionDef reuse StateDefSchema (identical shape)
 * from component-reference.ts, following the same pattern as util-reference.ts.
 * FeatureConfigDef reuses PropDefSchema for the same reason: a config input is
 * rendered as a provider prop, with an HTML attribute name derived from its key.
 */
import { z } from 'astro/zod';
import { PropDefSchema, StateDefSchema } from './component-reference';

export const FeatureStateDefSchema = StateDefSchema;

export const FeatureActionDefSchema = StateDefSchema;

export const FeatureConfigDefSchema = PropDefSchema;

export const FeatureReferenceSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  state: z.record(z.string(), FeatureStateDefSchema),
  actions: z.record(z.string(), FeatureActionDefSchema),
  /** Provider inputs the feature adds when selected. Empty for unconfigured features. */
  config: z.record(z.string(), FeatureConfigDefSchema).default({}),
});

export type FeatureStateDef = z.infer<typeof FeatureStateDefSchema>;
export type FeatureActionDef = z.infer<typeof FeatureActionDefSchema>;
export type FeatureConfigDef = z.infer<typeof FeatureConfigDefSchema>;
export type FeatureReference = z.infer<typeof FeatureReferenceSchema>;
