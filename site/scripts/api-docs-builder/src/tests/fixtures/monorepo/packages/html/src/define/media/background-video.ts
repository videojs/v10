/**
 * Mock background video registration — mirrors define/media/background-video.ts.
 *
 * Exercises: exclusion. BackgroundVideo uses MediaAttachMixin(HTMLElement)
 * without a media factory. The builder should discover this file (it registers an element with a static tagName) but
 * skip it because there is no composition to follow. Its API reference is manually maintained in MDX (#1243).
 */
import { BackgroundVideoElement } from '../../media/background-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(BackgroundVideoElement);
