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

const MediaTargetTagSchema = z.enum(['video', 'audio', 'iframe']);

const HtmlMediaReferenceSchema = z.object({
  target: MediaTargetTagSchema,
  attributes: z.object({
    standard: z.array(z.string()),
    custom: z.record(z.string(), HostPropertyDefSchema),
  }),
  properties: z.object({
    definitions: z.record(z.string(), HostPropertyDefSchema),
    native: z.array(z.string()),
  }),
  events: z.object({
    standard: z.array(z.string()),
    custom: z.array(MediaEventDefSchema),
  }),
  methods: z.array(z.string()),
  cssCustomProperties: z.record(z.string(), z.object({ description: z.string() })),
});

const ReactMediaReferenceSchema = z.object({
  target: MediaTargetTagSchema,
  acceptsNativeProps: z.boolean(),
  props: z.record(z.string(), HostPropertyDefSchema),
});

export const MediaReferenceSchema = z.object({
  name: z.string(),
  tagName: z.string(),
  mediaType: z.enum(['video', 'audio']),
  platforms: z.object({
    html: HtmlMediaReferenceSchema,
    react: ReactMediaReferenceSchema.optional(),
  }),
});

export type HostPropertyDef = z.infer<typeof HostPropertyDefSchema>;
export type MediaEventDef = z.infer<typeof MediaEventDefSchema>;
export type MediaReference = z.infer<typeof MediaReferenceSchema>;
export type HtmlMediaReference = MediaReference['platforms']['html'];
export type ReactMediaReference = NonNullable<MediaReference['platforms']['react']>;
