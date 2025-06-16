import type { ParserRule, ParserRuleOutputState, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that applies a rule one or more times.
 *
 * Similar to zeroOrMore but requires at least one successful match. If the
 * rule doesn't match at least once, the combinator fails. Returns a non-empty
 * array of results.
 *
 * @example
 * ```typescript
 * // Parse one or more digits
 * const digits = oneOrMore(token('DIGIT'));
 *
 * // Parse statement list (at least one statement required)
 * const statements = oneOrMore(statementRule);
 * ```
 *
 * @template TToken The token type
 * @template TValue The type of values returned by each application
 * @param rule The parser rule to apply repeatedly
 * @returns A parser rule that returns a non-empty array of results
 */
export function oneOrMore<TToken extends TokenType, TValue>(
  rule: ParserRule<TToken, TValue>,
): ParserRule<TToken, [TValue, ...Array<TValue>]> {
  return (state, helpers): ParserRuleResult<TToken, [TValue, ...Array<TValue>]> => {
    const { currentIndex: startIndex } = state;
    // Ensure at least one match is found
    const firstResult = rule(state, helpers);
    if (firstResult.type === ResultType.Error) return firstResult;
    const firstResultState = firstResult.value;
    const { value: firstValue } = firstResultState;
    // If a zero-length match was found (i.e. the rule succeeded but didn't consume any tokens),
    // bail out to prevent an infinite loop and exit successfully with the initial match
    if (firstResultState.currentIndex === startIndex) {
      return {
        type: ResultType.Success,
        value: {
          ...firstResultState,
          value: [firstResultState.value],
        },
      };
    }
    // First attempt succeeded and advanced - update the current state to reflect the first match
    // and proceed with matching an unlimited number of remaining items
    let currentState: ParserRuleOutputState<TToken, unknown> = {
      ...firstResultState,
      value: null,
    };
    const values: [TValue, ...Array<TValue>] = [firstValue];
    while (true) {
      const result = rule(currentState, helpers);
      // At the point where the rule fails, stop collecting and return the matched values so far
      if (result.type === ResultType.Error) break;
      const resultState = result.value;
      // If the rule succeeded but did not advance the parser state (i.e. a zero-length match),
      // break to avoid an infinite loop and exit successfully with the collected values so far
      if (resultState.currentIndex === currentState.currentIndex) break;
      const { value } = resultState;
      // The rule succeeded and advanced - append the result, update the current state and continue
      values.push(value);
      currentState = {
        ...resultState,
        tokens: [...currentState.tokens, ...resultState.tokens],
      };
    }
    // Return the collected values
    return {
      type: ResultType.Success,
      value: {
        ...currentState,
        value: values,
      },
    };
  };
}
