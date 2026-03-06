import { DestroyMixin, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/** Base class for interactive media UI elements. */
export class MediaElement extends DestroyMixin(ReactiveElement) {}

export interface MediaElementConstructor extends Constructor<MediaElement> {}
