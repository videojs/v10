/**
 * Mock poster feature — what a published config key still has to carry.
 *
 * Metadata already covers an input whose action is named by string. This one
 * covers the rest of that path: the initial value read from state() under a
 * plain key rather than a computed one, and an input typed by a union narrower
 * than plain text, which the config constraint has to admit.
 */
import { definePlayerFeature, type PlayerFeatureConfig } from '../../feature';

/** A named constant default, reached through a plain rather than computed key. */
const DEFAULT_POSTER = '/poster.jpg';

type PosterFit = 'contain' | 'cover';

/** Poster configuration and its user-config writers. */
interface PosterState {
  /** Image shown before playback starts. */
  poster: string;
  /** How the image fills the container. */
  posterFit: PosterFit;
  /** Sets the poster image. Absent input restores the default. */
  setPoster(value: string | null | undefined): void;
  /** Sets how the image fills the container. Absent input restores the default. */
  setPosterFit(value: PosterFit | null | undefined): void;
}

/** Shows a poster image until playback starts. */
export const posterFeature = definePlayerFeature({
  name: 'poster',
  config: {
    /** Image shown before playback starts. */
    poster: {
      action: 'setPoster',
      state: 'poster',
    },
    /** How the image fills the container. */
    posterFit: {
      action: 'setPosterFit',
      state: 'posterFit',
    },
  } satisfies PlayerFeatureConfig<PosterState>,
  state: (): PosterState => ({
    poster: DEFAULT_POSTER,
    posterFit: 'contain',
    setPoster: () => {},
    setPosterFit: () => {},
  }),
});
