/**
 * Mock background video — mirrors the real BackgroundVideo.
 *
 * Exercises: exclusion of elements that use MediaAttachMixin(HTMLElement)
 * without MediaPropsMixin. The builder's parseMixinChain returns null
 * because there is no MediaPropsMixin call in the extends chain.
 */
function MediaAttachMixin(base: any) {
  return base;
}

export class BackgroundVideo extends MediaAttachMixin(Object) {}
