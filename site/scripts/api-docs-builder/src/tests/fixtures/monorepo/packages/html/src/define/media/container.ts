/**
 * Mock media container registration — mirrors define/media/container.ts.
 *
 * Exercises: container exclusion. The real container.ts does NOT define a
 * new class with `static tagName` inline — it imports an already-defined
 * class. The builder should exclude this from media element discovery.
 */
class MediaContainerElement {
  static readonly tagName = 'media-container';
}

// No `export class ... extends` with `static tagName` — the class is
// defined elsewhere and only registered here.
export { MediaContainerElement };
