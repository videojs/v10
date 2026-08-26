/**
 * Mock simple video element registration — mirrors define/media/dash-video.ts.
 *
 * Exercises: registration-only discovery through an imported element implementation.
 */
import { SimpleVideoElement } from '../../media/simple-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(SimpleVideoElement);
