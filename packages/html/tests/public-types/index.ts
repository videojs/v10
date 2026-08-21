import { createPlayer, MediaElement, videoFeatures } from '@videojs/html';
import '@videojs/html/ui/slider-thumbnail';

const { ProviderMixin, PlayerController, context } = createPlayer({
  features: videoFeatures,
});

class CustomPlayerElement extends ProviderMixin(MediaElement) {}

declare const host: MediaElement;

new PlayerController(host, context);

void CustomPlayerElement;
