/**
 * Data attributes fixture for part-scoped attrs files.
 *
 * Exercises: extra data-attrs files ({component}-{x}-data-attrs.ts) declare
 * their target parts with a `@parts` JSDoc tag. Listed parts get the attrs
 * merged into whatever they already have — plain attach (label) and merge
 * with attrs inherited via the stateAttrMap heuristic (fill).
 */

/**
 * Data attributes set on caption-like parts.
 *
 * @parts label, fill
 */
export const GaugeLabelDataAttrs = {
  /** Present when the value is emphasized. */
  emphasized: 'data-emphasized',
} as const;
