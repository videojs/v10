export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};
