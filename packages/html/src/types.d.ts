declare module '*.css' {
  const content: string;
  export default content;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
