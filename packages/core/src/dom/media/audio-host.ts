import type { Audio, AudioEvents } from '../../core/media/types';
import { HTMLMediaElementHost, type HTMLMediaTargetLike } from './media-host';

export class HTMLAudioElementHost extends HTMLMediaElementHost<HTMLMediaTargetLike, AudioEvents> implements Audio {}
