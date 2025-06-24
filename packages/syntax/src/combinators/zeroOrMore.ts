import type { ParserRule, ParserRuleOutputState, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that applies a rule zero or more times.
 *
 * This combinator repeatedly applies the inner rule until it fails, collecting
 * all successful results in an array. It never fails itself - if no matches
 * are found, it returns an empty array.
 *
 * @example
 * ```typescript
 * // Parse zero or more whitespace tokens
 * const whitespace = zeroOrMore(token('WHITESPACE'));
 *
 * // Parse zero or more statements
 * const statements = zeroOrMore(statementRule);
 * ```
 *
 * @template TToken The token type
 * @template TValue The type of values returned by each application
 * @param rule The parser rule to apply repeatedly
 * @returns A parser rule that returns an array of results (possibly empty)
 */
export function zeroOrMore<TToken extends TokenType, TValue>(
  rule: ParserRule<TToken, TValue>,
): ParserRule<TToken, Array<TValue>> {
  return (state, helpers): ParserRuleResult<TToken, Array<TValue>> => {
    let currentState: ParserRuleOutputState<TToken, unknown> = {
      ...state,
      value: null,
      tokens: [],
    };
    const values: Array<TValue> = [];
    while (true) {
      const result = rule(currentState, helpers);
      // At the point where the rule fails, stop collecting and return the matched values so far
      if (result.type === ResultType.Error) break;
      const resultState = result.value;
      // If the rule succeeded but did not advance the parser state (i.e. a zero-length match),
      // break to avoid an infinite loop and exit successfully with the collected values so far
      if (resultState.currentIndex === currentState.currentIndex) break;
      // The rule succeeded and advanced - append the result, update the current state and continue
      values.push(resultState.value);
      currentState = {
        ...resultState,
        tokens: [...currentState.tokens, ...resultState.tokens],
      };
    }
    // Always succeed with the collected values (even if an empty list, i.e. no matches)
    return {
      type: ResultType.Success,
      value: {
        ...currentState,
        value: values,
      },
    };
  };
}
