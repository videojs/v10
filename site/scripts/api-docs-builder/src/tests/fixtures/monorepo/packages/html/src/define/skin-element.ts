/**
 * Mock SkinElement base class.
 *
 * The builder detects HTML skins by checking if a class extends SkinElement.
 * This fixture provides the base class for that inheritance check.
 */
export class SkinElement {
  static shadowRootOptions: any;
  static styles?: any;
  static template?: any;
}
