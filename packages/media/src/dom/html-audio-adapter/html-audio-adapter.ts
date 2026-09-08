import type { Audio, AudioEvents } from '../../core/types';
import {
  type AttributeConfigs,
  HTMLMediaAdapter,
  type HTMLMediaTargetLike,
  mediaContentAttributes,
} from '../html-media-adapter';

/** The content attributes an `<audio>` accepts: the media ones and nothing more. */
export const audioContentAttributes: AttributeConfigs = mediaContentAttributes;

export class HTMLAudioAdapter extends HTMLMediaAdapter<HTMLMediaTargetLike, AudioEvents> implements Audio {
  static readonly host = 'audio';
}
