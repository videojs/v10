/**
 * jsdom test setup for `core/dom`.
 *
 * Patches missing APIs that jsdom doesn't implement but our DOM code depends on.
 */

// jsdom lacks PointerEvent — polyfill via MouseEvent with pointer-specific properties.
if (typeof globalThis.PointerEvent === 'undefined') {
  // @ts-expect-error -- intentional incomplete polyfill for test environment.
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(type: string, init: PointerEventInit & MouseEventInit = {}) {
      super(type, { bubbles: true, ...init });
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
    }
  };
}
