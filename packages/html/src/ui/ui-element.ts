import { DestroyMixin, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/** Base class for interactive media UI elements. */
export class UIElement extends DestroyMixin(ReactiveElement) {}

export interface UIElementConstructor extends Constructor<UIElement> {}
