import { bufferSlice } from './buffer';
import { playbackSlice } from './playback';
import { sourceSlice } from './source';
import { timeSlice } from './time';
import { volumeSlice } from './volume';

export {
  bufferSlice as buffer,
  playbackSlice as playback,
  sourceSlice as source,
  timeSlice as time,
  volumeSlice as volume,
};

export const all = [bufferSlice, playbackSlice, sourceSlice, timeSlice, volumeSlice] as const;
