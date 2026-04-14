import type { Audio, AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost } from './media-host';

export class HTMLAudioElementHost extends HTMLMediaElementHost<HTMLAudioElement, AudioEvents> implements Audio {}
