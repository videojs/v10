import { z } from 'astro/zod';

export const HostPropertyDefSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  readonly: z.boolean(),
  overridesNative: z.boolean().optional(),
  default: z.string().optional(),
});

export const MediaEventDefSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export const MediaReferenceSchema = z.object({
  name: z.string(),
  tagName: z.string(),
  mediaType: z.enum(['video', 'audio']),
  hostProperties: z.record(z.string(), HostPropertyDefSchema),
  nativeAttributes: z.array(z.string()),
  events: z.object({
    native: z.array(z.string()),
    elementSpecific: z.array(MediaEventDefSchema),
  }),
  methods: z.array(z.string()),
  cssCustomProperties: z.record(z.string(), z.object({ description: z.string() })),
});

export type HostPropertyDef = z.infer<typeof HostPropertyDefSchema>;
export type MediaEventDef = z.infer<typeof MediaEventDefSchema>;
export type MediaReference = z.infer<typeof MediaReferenceSchema>;
