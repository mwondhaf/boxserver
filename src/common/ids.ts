// Branded ID types for type-safe database references.
declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Id<Table extends string> = string & Brand<Table>;

export function toId<Table extends string>(value: string): Id<Table> {
  return value as Id<Table>;
}

export function newId<Table extends string>(): Id<Table> {
  return crypto.randomUUID() as Id<Table>;
}
