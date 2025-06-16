import type { ParserRule, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create an combinator that always succeeds without consuming input.
 *
 * This combinator is useful for optional rules, default cases, or as a base case
 * in recursive grammars. It never fails and returns null as its value.
 *
 * @example
 * ```typescript
 * const optionalSemicolon = choice(
 *   token('SEMICOLON'),
 *   empty()  // Allow missing semicolon
 * );
 * ```
 *
 * @template TToken The token type
 * @returns A parser rule that always succeeds with null value
 */
export function empty<TToken extends TokenType>(): ParserRule<TToken, null> {
  return (state, _helpers): ParserRuleResult<TToken, null> => {
    // Return a success result with null value and the original unchanged state
    return {
      type: ResultType.Success,
      value: {
        ...state,
        value: null,
        tokens: [],
      },
    };
  };
}
