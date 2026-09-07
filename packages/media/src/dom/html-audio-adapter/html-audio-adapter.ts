import type { Audio, AudioEvents } from '../../core/types';
import { type AdapterHost, HTMLMediaAdapter, type HTMLMediaTargetLike } from '../html-media-adapter';

export class HTMLAudioAdapter extends HTMLMediaAdapter<HTMLMediaTargetLike, AudioEvents> implements Audio {
  static readonly host: AdapterHost = 'audio';
}
