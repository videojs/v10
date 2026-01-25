declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
