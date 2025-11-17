declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare global {
  declare module 'react' {
    interface Attributes {
      popover?: 'auto' | 'manual' | string;
      commandfor?: string;
    }
  }
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
