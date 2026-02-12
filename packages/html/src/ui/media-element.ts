import { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

export class MediaElement extends ReactiveElement {}

export interface MediaElementConstructor extends Constructor<MediaElement> {}
