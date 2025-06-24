import type {
  AstNode,
  ParserRule,
  ParserRuleOutputState,
  ParserRuleResult,
  TokenType,
} from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that wraps parsed properties in an AST node.
 *
 * Takes a rule that parses node properties and wraps the result in an AST node
 * structure with the specified type. This is the primary way to create typed
 * AST nodes from parsed content.
 *
 * @example
 * ```typescript
 * // Create a number literal node
 * const numberNode = node('NumberLiteral', struct(
 *   field('value', text(token('NUMBER')))
 * ));
 *
 * // Create a binary expression node
 * const binaryExpr = node('BinaryExpression', struct(
 *   field('left', expressionRule),
 *   field('operator', token('PLUS')),
 *   field('right', expressionRule)
 * ));
 * ```
 *
 * @template TToken The token type
 * @template TNodeType The AST node type name
 * @template TProperties The type of the node's properties object
 * @param type The type name for the AST node
 * @param propertiesRule Parser rule for the node's properties
 * @returns A parser rule that creates an AST node with type and properties
 */
export function node<
  TToken extends TokenType,
  TNodeType extends string,
  TProperties extends object,
>(
  type: TNodeType,
  propertiesRule: ParserRule<TToken, TProperties>,
): ParserRule<TToken, AstNode<TNodeType, TProperties>> {
  return (state, helpers): ParserRuleResult<TToken, AstNode<TNodeType, TProperties>> => {
    // Delegate matching of the node properties to the inner rule
    const result = propertiesRule(state, helpers);
    if (result.type === ResultType.Error) return result;
    // Wrap the successful result with an AST node wrapper of the provided type
    const resultState = result.value;
    const { value, tokens } = resultState;
    const node: AstNode<TNodeType, TProperties> = {
      type,
      properties: value,
      tokens: tokens.map(({ location }) => location),
    };
    // Return the node as the result
    const nodeState: ParserRuleOutputState<TToken, AstNode<TNodeType, TProperties>> = {
      ...resultState,
      value: node,
    };
    return {
      type: ResultType.Success,
      value: nodeState,
    };
  };
}
