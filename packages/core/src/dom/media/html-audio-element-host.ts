import type { Audio, AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './html-media-element-host';

export class HTMLAudioElementHost<Target extends HTMLAudioElement = HTMLAudioElement>
  extends HTMLMediaElementHost<Target, AudioEvents>
  implements Audio {}
