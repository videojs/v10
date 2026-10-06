export interface Handle<T> {
  current: T;
}

export interface Engine {
  input: Handle<string>;
}
