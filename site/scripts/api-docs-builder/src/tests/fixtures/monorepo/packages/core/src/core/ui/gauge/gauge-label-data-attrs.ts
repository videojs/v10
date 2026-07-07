/**
 * Data attributes fixture for part-scoped attrs files.
 *
 * Exercises: extra data-attrs files ({component}-{x}-data-attrs.ts) declare
 * their target parts with a @parts JSDoc tag on the exported const. Listed
 * parts get the attrs merged into whatever they already have — plain attach
 * (label) and merge with attrs inherited via the stateAttrMap heuristic
 * (fill). This header's own raw "@parts" mention is a deliberate hazard:
 * the builder must bind to the tag in the JSDoc block closest to the export,
 * not the first match anywhere in the file.
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
