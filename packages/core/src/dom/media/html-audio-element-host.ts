import type { AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './html-media-element-host';

export class HTMLAudioElementHost<
  Engine = unknown,
  Target extends HTMLAudioElement = HTMLAudioElement,
> extends HTMLMediaElementHost<Target, Engine, AudioEvents> {}
