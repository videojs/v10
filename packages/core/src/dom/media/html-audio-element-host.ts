import type { Audio, AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './html-media-element-host';

export class HTMLAudioElementHost extends HTMLMediaElementHost<HTMLAudioElement, AudioEvents> implements Audio {}
