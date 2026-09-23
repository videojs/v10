// HTML element fixture for multi-part sub-part.

class GaugePartElement {
  static readonly tagName = 'media-gauge-part';

  static readonly properties = {
    color: { type: String },
  };
}

/** The filled portion of the gauge. */
// @ts-expect-error TS2417 — tagName narrows the inherited literal, as the slider thumbnail's does.
export class GaugeFillElement extends GaugePartElement {
  static override readonly tagName = 'media-gauge-fill';
}
