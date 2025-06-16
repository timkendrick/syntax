import type {
  ParserRule,
  ParserRuleInputState,
  ParserRuleResult,
  Token,
  TokenType,
} from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that applies a series of rules in order.
 *
 * Applies each rule sequentially, threading the output state of one rule to the
 * input of the next. If any rule fails, the entire sequence fails. On success,
 * returns an array containing the results from each rule in order.
 *
 * @example
 * ```typescript
 * const addition = sequence(
 *   token('NUMBER'),
 *   token('PLUS'),
 *   token('NUMBER')
 * );
 * // Returns: [numberToken1, plusToken, numberToken2]
 * ```
 *
 * @template TToken The token type
 * @template TValues Array of value types returned by each rule
 * @param rules The parser rules to apply in sequence
 * @returns A parser rule that succeeds only if all sub-rules succeed
 */
export function sequence<TToken extends TokenType, TValues extends Array<unknown>>(
  ...rules: [...{ [K in keyof TValues]: ParserRule<TToken, TValues[K]> }]
): ParserRule<TToken, TValues> {
  return (state, helpers): ParserRuleResult<TToken, TValues> => {
    // Initialize arrays to collect the matched output values and tokens
    const values: TValues = [] as Array<unknown> as TValues;
    const tokens: Array<Token<TToken>> = [];
    // Iterate over the rules, collecting the output values and tokens for each rule,
    // updating the current state after each successful match
    let currentState: ParserRuleInputState<TToken> = state;
    for (const rule of rules) {
      const result = rule(currentState, helpers);
      if (result.type === ResultType.Error) return result;
      const resultState = result.value;
      values.push(resultState.value);
      tokens.push(...resultState.tokens);
      currentState = resultState;
    }
    // Return the final state along with the collected values and tokens
    return {
      type: ResultType.Success,
      value: {
        ...currentState,
        value: values,
        tokens,
      },
    };
  };
}
