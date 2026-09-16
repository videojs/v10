/**
 * Mock simple video element registration — mirrors define/media/dash-video.ts.
 *
 * Exercises: element discovery through `safeDefine()`, resolving to the element class and its static tagName in
 * media/simple-video/element.ts.
 */
import { SimpleVideoElement } from '../../media/simple-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(SimpleVideoElement);
