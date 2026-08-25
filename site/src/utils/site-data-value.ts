export type SiteDataPrimitive = boolean | number | string | null | undefined;
export interface SiteDataObject {
  readonly [key: string]: SiteDataValue;
}

/** Structured content data supplied by syntax trees and site content loaders. */
export type SiteDataValue = SiteDataPrimitive | SiteDataObject | readonly SiteDataValue[];
