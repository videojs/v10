/** How a host property maps to the content attribute that drives it. */
export interface HostAttributeConfig {
  type: BooleanConstructor | NumberConstructor | StringConstructor;
  /** The attribute name when it is not the lowercased property name. */
  attribute?: string;
  /** The value the property takes when the attribute is removed, when that is not the empty string. */
  empty?: unknown;
  /** A live-state property written alongside the owner. */
  state?: string;
}

export type HostAttributeConfigs = Record<string, HostAttributeConfig>;

/** Content attributes accepted by native audio and video hosts. */
export const mediaContentAttributes = {
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
} satisfies HostAttributeConfigs;

/** Content attributes accepted by a native audio host. */
export const audioContentAttributes = mediaContentAttributes;

/** Content attributes accepted by a native video host. */
export const videoContentAttributes = {
  ...mediaContentAttributes,
  autoPictureInPicture: { type: Boolean },
  disablePictureInPicture: { type: Boolean },
  playsInline: { type: Boolean },
  poster: { type: String, empty: '' },
} satisfies HostAttributeConfigs;
