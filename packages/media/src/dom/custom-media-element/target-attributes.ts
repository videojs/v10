/** How a media target property maps to the content attribute that drives it. */
export interface MediaTargetAttributeConfig {
  readonly type: BooleanConstructor | NumberConstructor | StringConstructor;
  /** The attribute name when it is not the lowercased property name. */
  readonly attribute?: string;
  /** The value the property takes when the attribute is removed, when that is not the empty string. */
  readonly empty?: unknown;
  /** A live-state property written alongside the owner. */
  readonly state?: string;
}

export type MediaTargetAttributeConfigs = Readonly<Record<string, MediaTargetAttributeConfig>>;

/** Content attributes accepted by native audio and video targets. */
export const mediaContentAttributes = Object.freeze({
  autoplay: { type: Boolean },
  controls: { type: Boolean },
  controlsList: { type: String },
  crossOrigin: { type: String, empty: null },
  defaultMuted: { type: Boolean, attribute: 'muted', state: 'muted' },
  disableRemotePlayback: { type: Boolean },
  loading: { type: String },
  loop: { type: Boolean },
  preload: { type: String, empty: null },
  src: { type: String, empty: '' },
} satisfies MediaTargetAttributeConfigs);

/** Content attributes accepted by a native audio target. */
export const audioContentAttributes = mediaContentAttributes;

/** Content attributes accepted by a native video target. */
export const videoContentAttributes = Object.freeze({
  ...mediaContentAttributes,
  autoPictureInPicture: { type: Boolean },
  disablePictureInPicture: { type: Boolean },
  playsInline: { type: Boolean },
  poster: { type: String, empty: '' },
} satisfies MediaTargetAttributeConfigs);
