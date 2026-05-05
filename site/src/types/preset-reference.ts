/**
 * Zod schemas for preset API reference JSON files.
 */
import { z } from 'astro/zod';

export const PresetSkinDefSchema = z.object({
  name: z.string(),
  tagName: z.string().optional(),
});

export const PresetFeatureRefSchema = z.object({
  name: z.string(),
  slug: z.string(),
  hasReference: z.boolean(),
});

export const PresetReferenceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  featureBundle: z.string(),
  features: z.array(PresetFeatureRefSchema),
  html: z.object({
    skins: z.array(PresetSkinDefSchema),
    mediaElement: z.string().optional(),
  }),
  react: z.object({
    skins: z.array(PresetSkinDefSchema),
    mediaElement: z.string(),
  }),
});

export type PresetSkinDef = z.infer<typeof PresetSkinDefSchema>;
export type PresetFeatureRef = z.infer<typeof PresetFeatureRefSchema>;
export type PresetReference = z.infer<typeof PresetReferenceSchema>;
