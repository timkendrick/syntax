import type { ParserRule, TokenType } from '../grammar.ts';

import { map } from './map.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { zeroOrMore } from './zeroOrMore.ts';

/**
 * Create a combinator for parsing separated sequences.
 *
 * Parses a list of items separated by a separator token. The separator values
 * are discarded, only the item values are returned in the result array.
 * Supports configurable minimum length requirements.
 *
 * @example
 * ```typescript
 * // Parse comma-separated numbers: "1, 2, 3"
 * const numberList = list(
 *   token('NUMBER'),
 *   token('COMMA')
 * );
 *
 * // Parse function parameters with minimum 1 argument
 * const parameters = list(
 *   parameterRule,
 *   token('COMMA'),
 *   { minLength: 1 }
 * );
 * ```
 *
 * @template TToken The token type
 * @template TValue The type of items in the list
 * @param item Parser rule for individual list items
 * @param separator Parser rule for separator between items
 * @param options Configuration options including minimum length
 * @returns A parser rule that returns an array of item values
 */
export function list<TToken extends TokenType, TValue>(
  item: ParserRule<TToken, TValue>,
  separator: ParserRule<TToken, unknown>,
  options?: { minLength?: number },
): ParserRule<TToken, Array<TValue>> {
  const { minLength = 0 } = options ?? {};
  return createListMatcher(item, separator, minLength);
}

function createListMatcher<TToken extends TokenType, TValue>(
  item: ParserRule<TToken, TValue>,
  separator: ParserRule<TToken, unknown>,
  minLength: number,
): ParserRule<TToken, Array<TValue>> {
  // If the minimum length is 0, make the entire list matcher optional and handle the empty case
  if (minLength <= 0) {
    const listMatcher = createListMatcher(item, separator, 1);
    return map(optional(listMatcher), (values) => values ?? []);
  }
  // Otherwise create a matcher for the minimum number of items followed by zero or more extra items
  const tailItem = map(
    sequence<TToken, [unknown, TValue]>(separator, item),
    ([_separator, value]) => value,
  );
  return map(
    sequence(item, ...repeat(tailItem, minLength), zeroOrMore(tailItem)),
    combineListResults,
  );
}

function combineListResults<TValue>(result: [...Array<TValue>, Array<TValue>]): Array<TValue> {
  const headItems = result.slice(0, result.length - 1) as Array<TValue>;
  const restItems = result[result.length - 1] as Array<TValue>;
  return [...headItems, ...restItems];
}

function repeat<T>(value: T, minLength: number): Array<T> {
  return Array.from({ length: minLength - 1 }, () => value);
}
