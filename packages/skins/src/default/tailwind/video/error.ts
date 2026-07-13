import { cn } from '@videojs/utils/style';
import { error as baseError } from '../components/error';
import { surface } from '../components/surface';

export const root = cn(baseError.popup, surface, 'text-shadow-2xs text-shadow-black/25');
export const title = cn(baseError.title, 'text-base');
export const description = baseError.description;
export const close = baseError.close;

export const dialog = cn(baseError.dialog, surface, 'text-shadow-2xs text-shadow-black/25');
export const content = cn(baseError.content, 'text-shadow-inherit');
export const actions = baseError.actions;
