/**
 * Mock shared media host base — mirrors the real media-host.ts.
 *
 * Exercises method extraction: the builder collects public instance methods
 * from this class (per media type) for the reference's `methods` field.
 * Lifecycle methods (attach/detach/destroy) and accessors are excluded.
 *
 * Also exercises native-property extraction: getters/setters whose names match
 * native HTMLMediaElement members surface in `nativeProperties`; non-native
 * accessors (e.g. `streamType`) and re-declared natives (`src`) do not.
 */
export class HTMLMediaElementHost {
  // Lifecycle methods — excluded from `methods`.
  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}

  // Internal — excluded by the `_` prefix.
  _forward(): void {}

  // Accessor — excluded from `methods` (it's a property, not a method). Native
  // member, but re-declared on engine hosts → deduped out of nativeProperties.
  get src(): string {
    return '';
  }

  // Native passthroughs — surface in nativeProperties.
  get currentTime(): number {
    return 0;
  }
  set currentTime(_value: number) {}

  get volume(): number {
    return 1;
  }
  set volume(_value: number) {}

  // Video.js-specific — NOT a native member, so excluded from nativeProperties.
  /**
   * Current stream type (`'on-demand'`, `'live'`, or `'unknown'`). Consumers can
   * set it when the host does not detect the stream type automatically.
   */
  get streamType(): string {
    return 'unknown';
  }
  set streamType(_value: string) {}

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  load(): void {}

  canPlayType(_type: string): string {
    return '';
  }
}
