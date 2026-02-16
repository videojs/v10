/**
 * Zod schemas for util API reference JSON files (hooks, controllers, mixins, etc.).
 *
 * ParamDef reuses PropDefSchema (identical shape) from component-reference.ts.
 * ReturnFieldDef reuses StateDefSchema (identical shape).
 */
import { z } from 'astro/zod';
import { PropDefSchema, StateDefSchema } from './component-reference';

export const ParamDefSchema = PropDefSchema;

export const ReturnFieldDefSchema = StateDefSchema;

export const ReturnValueSchema = z.object({
  type: z.string(),
  shortType: z.string().optional(),
  description: z.string().optional(),
  fields: z.record(z.string(), ReturnFieldDefSchema).optional(),
});

export const UtilOverloadSchema = z.object({
  description: z.string().optional(),
  parameters: z.record(z.string(), ParamDefSchema),
  returnValue: ReturnValueSchema,
});

export const UtilReferenceSchema = z.object({
  name: z.string(),
  kind: z.enum(['hook', 'utility', 'factory', 'controller', 'mixin', 'context', 'selector']),
  description: z.string().optional(),
  overloads: z.array(UtilOverloadSchema).min(1),
  frameworks: z.array(z.string()).optional(),
});

export type ParamDef = z.infer<typeof ParamDefSchema>;
export type ReturnFieldDef = z.infer<typeof ReturnFieldDefSchema>;
export type ReturnValue = z.infer<typeof ReturnValueSchema>;
export type UtilOverload = z.infer<typeof UtilOverloadSchema>;
export type UtilReference = z.infer<typeof UtilReferenceSchema>;
