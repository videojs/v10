/**
 * Mock background video registration — mirrors define/media/background-video.ts.
 *
 * Exercises: exclusion. BackgroundVideo uses MediaAttachMixin(HTMLElement)
 * without MediaPropsMixin. The builder should discover this file (it has
 * through its imported implementation but skip it because parseMixinChain returns null.
 * Its API reference is manually maintained in MDX (#1243).
 */
import { BackgroundVideoElement } from '../../media/background-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(BackgroundVideoElement);
