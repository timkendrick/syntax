import type { ParserRule, ParserRuleOutputState, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that extracts source text from matched tokens.
 *
 * Takes a rule that matches a series of tokens and returns the concatenated
 * source text of all tokens consumed by that rule. This is useful for
 * extracting string values from token sequences.
 *
 * @example
 * ```typescript
 * // Extract text content from identifier token
 * const identifierText = text(token('IDENTIFIER'));
 *
 * // Extract text from sequence of tokens
 * const fullName = text(sequence(
 *   token('FIRST_NAME'),
 *   token('SPACE'),
 *   token('LAST_NAME')
 * ));
 * ```
 *
 * @template TToken The token type
 * @param rule The parser rule that matches tokens
 * @returns A parser rule that returns the concatenated source text
 */
export function text<TToken extends TokenType>(
  rule: ParserRule<TToken, unknown>,
): ParserRule<TToken, string> {
  return (state, helpers): ParserRuleResult<TToken, string> => {
    const { getTokenSource } = helpers;
    // Delegate matching to the inner rule
    const result = rule(state, helpers);
    if (result.type === ResultType.Error) return result;
    // For successful matches, read the matched tokens and concatenate them into a string
    const resultState = result.value;
    const { tokens } = resultState;
    const source = tokens.map(getTokenSource).join('');
    // Return the concatenated string as the overall result
    const textResultState: ParserRuleOutputState<TToken, string> = {
      ...resultState,
      value: source,
    };
    return {
      type: ResultType.Success,
      value: textResultState,
    };
  };
}
