/**
 * Mock caption-style feature — the degrade paths, kept in one place.
 *
 * Exercises: a config input whose action has no matching source-state member
 * (type falls back to "unknown" and warns), and one whose action/state are not
 * plain identifiers (dropped and warned). Both produce plausible-looking but
 * wrong reference output when they pass silently, so the suite pins the
 * warnings as well as the output.
 */
import type { MediaContentValue } from '../../../../../media/src/core/state';
import { definePlayerFeature } from '../../feature';

const USER_FONT = Symbol('user-font');
const SET_USER_FONT = Symbol('set-user-font');
const MISSING_ACTION = Symbol('missing-action');

interface CaptionStyleSourceState {
  [USER_FONT]: MediaContentValue;
  [SET_USER_FONT](value: MediaContentValue): void;
  /** The font family in use. */
  fontFamily: string;
}

/** Resolves caption styling overrides into player state. */
export const captionStyleFeature = definePlayerFeature({
  name: 'captionStyle',
  // Deliberately malformed: the builder must degrade loudly, not silently.
  config: {
    /** Points at an action the source state never declares. */
    fontFamily: {
      action: MISSING_ACTION,
      state: USER_FONT,
    },
    /** Uses a computed action rather than a plain identifier. */
    fontSize: {
      action: [SET_USER_FONT][0],
      state: USER_FONT,
    },
  } as never,
  state: (): CaptionStyleSourceState => ({
    [USER_FONT]: undefined,
    [SET_USER_FONT]: () => {},
    fontFamily: '',
  }),
});
