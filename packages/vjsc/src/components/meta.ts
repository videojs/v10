export interface ComponentMeta {
  readonly name: string;
  readonly [key: string]: import('../value').VjscValue;
}
