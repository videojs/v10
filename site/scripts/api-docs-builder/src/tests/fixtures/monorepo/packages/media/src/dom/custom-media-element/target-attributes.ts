export const mediaContentAttributes = {
  autoplay: { type: Boolean },
  controls: { type: Boolean },
  controlsList: { type: String },
  crossOrigin: { type: String },
  defaultMuted: { type: Boolean, attribute: 'muted' },
  disableRemotePlayback: { type: Boolean },
  loading: { type: String },
  loop: { type: Boolean },
  preload: { type: String },
  src: { type: String },
};

export const audioContentAttributes = mediaContentAttributes;

export const videoContentAttributes = {
  ...mediaContentAttributes,
  autoPictureInPicture: { type: Boolean },
  disablePictureInPicture: { type: Boolean },
  playsInline: { type: Boolean },
  poster: { type: String },
};
