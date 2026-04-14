/**
 * Mock feature bundles.
 *
 * Exercises: feature bundle arrays (plural *Features naming), feature list
 * resolution from array elements. videoFeatures has both features,
 * audioFeatures has only playback.
 */
import { playbackFeature } from './playback';
import { volumeFeature } from './volume';

export const videoFeatures = [playbackFeature, volumeFeature];

export const audioFeatures = [playbackFeature];
