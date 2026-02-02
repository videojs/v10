/** Media element contract. */
export interface Media extends HTMLMediaElement {}

/** Container element contract. */
export interface MediaContainer extends HTMLElement {}

/** Composite target for player features. */
export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

/** Feature capability availability. */
export type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
