import { cn } from '@videojs/utils/style';
import { buttonGroup as baseButtonGroup } from '../components/button-group';

export const start = cn(baseButtonGroup, 'flex-1 @2xl/media-container:flex-none');
export const end = cn(baseButtonGroup, 'flex-1 justify-end @2xl/media-container:flex-none');
