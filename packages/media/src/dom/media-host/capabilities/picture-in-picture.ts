import { defineMediaCapability } from '../capability';

/**
 * The part of picture-in-picture the media itself owns.
 *
 * Entering, leaving, and reading the current mode run against `document`, not the media, so they stay members of the
 * host that knows about presentation modes. Composing this capability is still what marks a media as one that
 * picture-in-picture applies to at all.
 */
export interface MediaDisablePictureInPictureCapability {
  disablePictureInPicture: boolean;
}

export const pictureInPictureCapability = defineMediaCapability<MediaDisablePictureInPictureCapability>()({
  name: 'picture-in-picture',
  events: ['enterpictureinpicture', 'leavepictureinpicture'],
  attributes: {
    disablePictureInPicture: { type: Boolean },
  },
  props: {
    disablePictureInPicture: { fallback: false },
  },
});
