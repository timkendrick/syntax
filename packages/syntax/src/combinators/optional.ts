import type { ParserRule, ParserRuleOutputState, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that allows a rule to succeed or fail.
 *
 * This combinator never fails - if the inner rule succeeds, it returns the
 * result; if the inner rule fails, it returns null without consuming input.
 * This is useful for optional syntax elements.
 *
 * @example
 * ```typescript
 * // Optional trailing comma
 * const optionalComma = optional(token('COMMA'));
 *
 * // Optional type annotation
 * const typeAnnotation = optional(sequence(
 *   token('COLON'),
 *   typeRule
 * ));
 * ```
 *
 * @template TToken The token type
 * @template TValue The type of value returned by the inner rule
 * @param rule The parser rule to make optional
 * @returns A parser rule that returns the value or null, never fails
 */
export function optional<TToken extends TokenType, TValue>(
  rule: ParserRule<TToken, TValue>,
): ParserRule<TToken, TValue | null> {
  return (state, helpers): ParserRuleResult<TToken, TValue | null> => {
    // Attempt to match the rule - if successful, return the match result
    const result = rule(state, helpers);
    if (result.type === ResultType.Success) {
      const resultState = result.value;
      return {
        type: ResultType.Success,
        value: resultState,
      };
    }
    // If the match failed, return a success result with null value and the original unchanged state
    const unmatchedResultState: ParserRuleOutputState<TToken, TValue | null> = {
      ...state,
      value: null,
      tokens: [],
    };
    return {
      type: ResultType.Success,
      value: unmatchedResultState,
    };
  };
}
