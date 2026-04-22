/**
 * Mock definePlayerFeature — identity function matching the real signature.
 * The builder only needs the TypeScript types to resolve; it never runs this.
 */
export const definePlayerFeature = <State>(config: {
  name?: string;
  state: (ctx: any) => State;
  attach?: (ctx: any) => void;
}) => config;
