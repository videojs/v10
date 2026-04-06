import { DashCustomMedia, DashMediaDelegate } from '@videojs/core/dom/media/dash';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MediaPropsMixin } from '../../utils/media-props-mixin';

export class DashVideo extends MediaPropsMixin(MediaAttachMixin(DashCustomMedia), DashMediaDelegate) {
  constructor() {
    super();
    this.attach(this.target);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.destroy();
    }
  }
}
