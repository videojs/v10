/**
 * Mock definePlayerFeature — identity function matching the real signature.
 * The builder only needs the TypeScript types to resolve; it never runs this.
 */
export type PlayerFeatureConfig<State = never> = Record<
  string,
  { action: keyof State | PropertyKey; state: keyof State | PropertyKey }
>;

export const definePlayerFeature = <State>(config: {
  name?: string;
  config?: PlayerFeatureConfig<any>;
  state: (ctx: any) => State;
  derived?: Record<string, (ctx: any) => unknown>;
  attach?: (ctx: any) => void;
}) => config;
