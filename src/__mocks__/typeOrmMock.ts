type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never;
}[keyof T];

type MockedFunction<T> = T extends (...args: infer P) => infer R ? jest.Mock<R, P> : never;

export type MockRepository<T> = {
  [K in MethodNames<T>]: MockedFunction<T[K]>;
};
