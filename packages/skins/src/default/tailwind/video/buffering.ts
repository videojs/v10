import { cn } from '@videojs/utils/style';
import { bufferingIndicator as baseBufferingIndicator } from '../components/buffering';
import { surface } from '../components/surface';

export const root = cn(baseBufferingIndicator.root, surface);
