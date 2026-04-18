import type { Audio, AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './media-host';

export const AUDIO_ELEMENT_HOST_SYMBOL = Symbol.for('@videojs/audio-element-host');

export class HTMLAudioElementHost extends HTMLMediaElementHost<HTMLAudioElement, AudioEvents> implements Audio {
  readonly [AUDIO_ELEMENT_HOST_SYMBOL] = true;
}
