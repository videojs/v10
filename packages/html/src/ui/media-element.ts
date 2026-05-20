import { DestroyMixin, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/** Base class for interactive media UI elements. Composes destroy lifecycle onto `ReactiveElement`. */
export class MediaElement extends DestroyMixin(ReactiveElement) {}

/** Constructor signature for classes assignable to `MediaElement`. */
export interface MediaElementConstructor extends Constructor<MediaElement> {}
