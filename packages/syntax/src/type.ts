/**
 * Assert that a value is not `null` or `undefined`.
 *
 * This function is useful for type narrowing, e.g. within `.filter()` / `.find()` calls.
 *
 * @param value - The value to check
 * @returns `true` if the value is not `null` or `undefined`, `false` otherwise
 * @example
 * ```typescript
 * const evenNumbers: Array<number> = Array.from({ length: 10 }, (_, i) => i)
 *   .map((i) => (i % 2 === 0 ? i : null))
 *   .filter(isNonNull);
 * ```
 */
export function isNonNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

/**
 * Helper function to assert that a case is exhaustive.
 *
 * If the provided value is not `never`, the function call will not type-check.
 * @param value - A value that has been type-narrowed to `never`
 * @example
 * ```typescript
 * function greet(greeting: "hello" | "goodbye") {
 *   switch (greeting) {
 *     case "hello":
 *       console.log('Hello, world!');
 *       break;
 *     default:
 *       return unreachable(greeting); // Type error: Argument of type '"goodbye"' is not assignable to parameter of type 'never'.
 *   }
 * }
 * ```
 */
export function unreachable(value: never): never {
  throw new TypeError(`Unexpected value: ${value}`);
}
