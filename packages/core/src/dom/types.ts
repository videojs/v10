export interface Media extends HTMLMediaElement {}

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
