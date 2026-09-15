import type {
  AttributeDeclaration,
  AttributeDeclarationMap,
  AttributeDeclarationsFor,
  AttributeValue,
} from '@videojs/element/attributes';

interface MediaAttributeOptions {
  /** Another property that receives the parsed value, such as `muted` for the `defaultMuted` content attribute. */
  readonly linkedProperty?: string;
}

/** How a media property maps to the content attribute that drives it. */
export type MediaAttributeDeclaration<Value = AttributeValue> = AttributeDeclaration<Value> & MediaAttributeOptions;

export type MediaAttributeDeclarations = AttributeDeclarationMap<MediaAttributeDeclaration>;

export type MediaAttributeDeclarationsFor<Properties extends object> = AttributeDeclarationsFor<
  Properties,
  MediaAttributeOptions
>;

/** Content attributes accepted by native audio and video targets. */
export const mediaContentAttributes = Object.freeze({
  autoplay: { type: Boolean },
  controls: { type: Boolean },
  controlsList: { type: String },
  crossOrigin: { type: String, defaultValue: null },
  defaultMuted: { type: Boolean, attribute: 'muted', linkedProperty: 'muted' },
  disableRemotePlayback: { type: Boolean },
  loading: { type: String },
  loop: { type: Boolean },
  preload: { type: String, defaultValue: null },
  src: { type: String, defaultValue: '' },
} satisfies MediaAttributeDeclarations);

/** Content attributes accepted by a native audio target. */
export const audioContentAttributes = mediaContentAttributes;

/** Content attributes accepted by a native video target. */
export const videoContentAttributes = Object.freeze({
  ...mediaContentAttributes,
  autoPictureInPicture: { type: Boolean },
  disablePictureInPicture: { type: Boolean },
  playsInline: { type: Boolean },
  poster: { type: String, defaultValue: '' },
} satisfies MediaAttributeDeclarations);
