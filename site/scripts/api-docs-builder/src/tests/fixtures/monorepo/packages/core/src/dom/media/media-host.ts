/**
 * Mock shared media host base — mirrors the real media-host.ts.
 *
 * Exercises method extraction: the builder collects public instance methods
 * from this class (per media type) for the reference's `methods` field.
 * Lifecycle methods (attach/detach/destroy) and accessors are excluded.
 */
export class HTMLMediaElementHost {
  // Lifecycle methods — excluded from `methods`.
  attach(_target: EventTarget): void {}
  detach(): void {}
  destroy(): void {}

  // Internal — excluded by the `_` prefix.
  _forward(): void {}

  // Accessor — excluded (getters/setters are properties, not methods).
  get src(): string {
    return '';
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  load(): void {}

  canPlayType(_type: string): string {
    return '';
  }
}
