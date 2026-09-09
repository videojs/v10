/**
 * HTML element fixture for multi-part sub-part.
 */

class GaugePartElement {
  static readonly properties = {
    color: { type: String },
  };
}

export class GaugeFillElement extends GaugePartElement {
  static readonly tagName = 'media-gauge-fill';
}
