/**
 * Zod schemas for API reference JSON files.
 *
 * This is the single source of truth for the shape of generated API reference data. Both the builder
 * (scripts/api-docs-builder) and Astro components import from here.
 */
import { z } from 'astro/zod';

export const PropDefSchema = z.object({
  type: z.string(),
  detailedType: z.string().optional(),
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
  frameworks: z.array(z.enum(['html', 'react'])).optional(),
});

export const StateDefSchema = z.object({
  type: z.string(),
  detailedType: z.string().optional(),
  description: z.string().optional(),
});

export const DataAttrDefSchema = z.object({
  description: z.string(),
  type: z.string().optional(),
  detailedType: z.string().optional(),
});

export const CSSVarDefSchema = z.object({
  description: z.string(),
});

export const ComponentEventDefSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export const PartReferenceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  props: z.record(z.string(), PropDefSchema),
  state: z.record(z.string(), StateDefSchema),
  dataAttributes: z.record(z.string(), DataAttrDefSchema),
  cssCustomProperties: z.record(z.string(), CSSVarDefSchema),
  platforms: z.object({
    html: z
      .object({
        tagName: z.string(),
        events: z.array(ComponentEventDefSchema).optional(),
      })
      .optional(),
    react: z.object({}).optional(),
  }),
});

export const ComponentReferenceSchema = PartReferenceSchema.extend({
  parts: z.record(z.string(), PartReferenceSchema).optional(),
});

export type PropDef = z.infer<typeof PropDefSchema>;
export type StateDef = z.infer<typeof StateDefSchema>;
export type DataAttrDef = z.infer<typeof DataAttrDefSchema>;
export type CSSVarDef = z.infer<typeof CSSVarDefSchema>;
export type ComponentEventDef = z.infer<typeof ComponentEventDefSchema>;
export type PartReference = z.infer<typeof PartReferenceSchema>;
export type ComponentReference = z.infer<typeof ComponentReferenceSchema>;
