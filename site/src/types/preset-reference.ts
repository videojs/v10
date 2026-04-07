/**
 * Zod schemas for preset API reference JSON files.
 */
import { z } from 'astro/zod';

export const PresetSkinDefSchema = z.object({
  name: z.string(),
  tagName: z.string().optional(),
});

export const PresetReferenceSchema = z.object({
  name: z.string(),
  featureBundle: z.string(),
  features: z.array(z.string()),
  html: z.object({
    skins: z.array(PresetSkinDefSchema),
  }),
  react: z.object({
    skins: z.array(PresetSkinDefSchema),
    mediaElement: z.string(),
  }),
});

export type PresetSkinDef = z.infer<typeof PresetSkinDefSchema>;
export type PresetReference = z.infer<typeof PresetReferenceSchema>;
