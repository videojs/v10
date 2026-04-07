/// <reference path="../../../../node_modules/mux-embed/dist/types/mux-embed.d.ts" preserve="true" />
export type { Mux as MuxDataSdk, Options as MuxDataOptions } from 'mux-embed';

export type ValueOf<T> = T[keyof T];

export const MaxResolution = {
  upTo720p: '720p',
  upTo1080p: '1080p',
  upTo1440p: '1440p',
  upTo2160p: '2160p',
} as const;

export const MinResolution = {
  noLessThan480p: '480p',
  noLessThan540p: '540p',
  noLessThan720p: '720p',
  noLessThan1080p: '1080p',
  noLessThan1440p: '1440p',
  noLessThan2160p: '2160p',
} as const;

export const RenditionOrder = {
  DESCENDING: 'desc',
} as const;

export const MaxAutoResolution = {
  upTo720p: '720p',
  upTo1080p: '1080p',
  upTo1440p: '1440p',
  upTo2160p: '2160p',
} as const;

export type MaxResolutionValue = ValueOf<typeof MaxResolution>;
export type MinResolutionValue = ValueOf<typeof MinResolution>;
export type RenditionOrderValue = ValueOf<typeof RenditionOrder>;
export type MaxAutoResolutionValue = ValueOf<typeof MaxAutoResolution>;

export type Tokens = {
  playback?: string;
  drm?: string;
  thumbnail?: string;
  storyboard?: string;
};
