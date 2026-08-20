/**
 * Mock caption-style feature — the paths metadata doesn't use, kept in one place.
 *
 * Exercises: a config input whose action names an inherited public setter
 * outright (public setters are optional, and this is the fixture that carries
 * one), a named constant resolved to its literal in the default column, a state
 * key left at `undefined` and therefore omitted from that column, one input
 * whose action has no matching source-state member (type falls back to
 * "unknown" and warns), and one whose action is neither an identifier nor a
 * string (dropped and warned).
 *
 * The last two produce plausible-looking but wrong reference output when they
 * pass silently, so the suite pins the warnings as well as the output.
 */
import type { MediaCaptionStyleState, MediaContentValue } from '../../../../../media/src/core/state';
import { definePlayerFeature } from '../../feature';

const USER_FONT = Symbol('user-font');
const USER_SIZE = Symbol('user-size');
const SET_USER_FONT = Symbol('set-user-font');
const MISSING_ACTION = Symbol('missing-action');

/** A named constant default, to prove it is resolved rather than printed by name. */
const FALLBACK_FONT = 'sans-serif';

interface CaptionStyleSourceState extends MediaCaptionStyleState {
  [USER_FONT]: MediaContentValue;
  [USER_SIZE]: MediaContentValue;
  [SET_USER_FONT](value: MediaContentValue): void;
}

/** Resolves caption styling overrides into player state. */
export const captionStyleFeature = definePlayerFeature({
  name: 'captionStyle',
  // Partly malformed on purpose: the builder must degrade loudly, not silently.
  config: {
    /** Forwards to an inherited public setter, named outright. */
    fontFamily: {
      action: 'setFontFamily',
      state: USER_FONT,
    },
    /** Points at an action the source state never declares. */
    fontStretch: {
      action: MISSING_ACTION,
      state: USER_SIZE,
    },
    /** Uses a computed action, which is neither an identifier nor a string. */
    fontSize: {
      action: [SET_USER_FONT][0],
      state: USER_SIZE,
    },
  } as never,
  state: (): CaptionStyleSourceState => ({
    [USER_FONT]: FALLBACK_FONT,
    [USER_SIZE]: undefined,
    [SET_USER_FONT]: () => {},
    fontFamily: '',
    setFontFamily: () => {},
  }),
});
