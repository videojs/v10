/**
 * Zod schemas for feature API reference JSON files.
 *
 * FeatureStateDef and FeatureActionDef reuse StateDefSchema (identical shape)
 * from component-reference.ts, following the same pattern as util-reference.ts.
 */
import { z } from 'astro/zod';
import { StateDefSchema } from './component-reference';

export const FeatureStateDefSchema = StateDefSchema;

export const FeatureActionDefSchema = StateDefSchema;

export const FeatureReferenceSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  state: z.record(z.string(), FeatureStateDefSchema),
  actions: z.record(z.string(), FeatureActionDefSchema),
});

export type FeatureStateDef = z.infer<typeof FeatureStateDefSchema>;
export type FeatureActionDef = z.infer<typeof FeatureActionDefSchema>;
export type FeatureReference = z.infer<typeof FeatureReferenceSchema>;
