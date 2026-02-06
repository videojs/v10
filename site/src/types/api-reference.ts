/**
 * Zod schemas for API reference JSON files.
 *
 * This is the single source of truth for the shape of generated API reference data.
 * Both the builder (scripts/api-docs-builder) and Astro components import from here.
 */
import { z } from 'astro/zod';

export const PropDefSchema = z.object({
  type: z.string(),
  shortType: z.string().optional(),
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
});

export const StateDefSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
});

export const DataAttrDefSchema = z.object({
  description: z.string(),
});

export const ComponentApiReferenceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  props: z.record(z.string(), PropDefSchema),
  state: z.record(z.string(), StateDefSchema),
  dataAttributes: z.record(z.string(), DataAttrDefSchema),
  platforms: z.object({
    html: z
      .object({
        tagName: z.string(),
      })
      .optional(),
  }),
});

export type PropDef = z.infer<typeof PropDefSchema>;
export type StateDef = z.infer<typeof StateDefSchema>;
export type DataAttrDef = z.infer<typeof DataAttrDefSchema>;
export type ComponentApiReference = z.infer<typeof ComponentApiReferenceSchema>;
