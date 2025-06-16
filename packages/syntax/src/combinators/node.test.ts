import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type AstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { node } from './node.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { field, struct } from './struct.ts';
import { token } from './token.ts';

describe(node, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
    OpenParen = 'OpenParen',
    CloseParen = 'CloseParen',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
      [TestTokenType.OpenParen]: '(',
      [TestTokenType.CloseParen]: ')',
    },
    rules: (_) => ({}),
  });

  describe('basic node creation', () => {
    type TestMatcherResult = AstNode<'TestNode', { value: Token<TestTokenType.Foo> }>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => node('TestNode', struct(field('value', token(_.Foo)))),
    );

    it.each([
      {
        label: 'successful node creation',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'TestNode',
              properties: {
                value: {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
              },
              tokens: [{ start: 0, end: 3 }],
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'properties rule fails',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 3 },
          }),
        },
      },
      {
        label: 'empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 0 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('different node types - simplified', () => {
    type TestMatcherResult = AstNode<'CustomNode', { token: Token<TestTokenType.Bar> }>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => node('CustomNode', struct(field('token', token(_.Bar)))),
    );

    it.each([
      {
        label: 'different node type',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'CustomNode',
              properties: {
                token: {
                  type: TestTokenType.Bar,
                  location: { start: 0, end: 3 },
                },
              },
              tokens: [{ start: 0, end: 3 }],
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('empty properties', () => {
    type TestMatcherResult = AstNode<'EmptyNode', object>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => node('EmptyNode', struct()),
    );

    it.each([
      {
        label: 'empty properties node',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'EmptyNode',
              properties: {},
              tokens: [],
            },
            tokens: [],
          },
        },
      },
      {
        label: 'empty properties with unexpected input',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('complex properties', () => {
    type TestMatcherResult = AstNode<
      'ComplexNode',
      {
        first: Token<TestTokenType.Foo>;
        second: Token<TestTokenType.Bar>;
        optional: Token<TestTokenType.Baz> | null;
      }
    >;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        node(
          'ComplexNode',
          struct(
            field('first', token(_.Foo)),
            field('second', token(_.Bar)),
            field('optional', optional(token(_.Baz))),
          ),
        ),
    );

    it.each([
      {
        label: 'all properties present',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'ComplexNode',
              properties: {
                first: {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                second: {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
                optional: {
                  type: TestTokenType.Baz,
                  location: { start: 6, end: 9 },
                },
              },
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
                { start: 6, end: 9 },
              ],
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'optional property absent',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'ComplexNode',
              properties: {
                first: {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                second: {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
                optional: null,
              },
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
              ],
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'required property missing',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 3, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('nested nodes', () => {
    type InnerNodeType = AstNode<'InnerNode', { value: Token<TestTokenType.Foo> }>;
    type TestMatcherResult = AstNode<'OuterNode', { inner: InnerNodeType }>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        node(
          'OuterNode',
          struct(field('inner', node('InnerNode', struct(field('value', token(_.Foo)))))),
        ),
    );

    it.each([
      {
        label: 'nested node creation',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'OuterNode',
              properties: {
                inner: {
                  type: 'InnerNode',
                  properties: {
                    value: {
                      type: TestTokenType.Foo,
                      location: { start: 0, end: 3 },
                    },
                  },
                  tokens: [{ start: 0, end: 3 }],
                },
              },
              tokens: [{ start: 0, end: 3 }],
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'nested node fails',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('node with sequence properties', () => {
    type TestMatcherResult = AstNode<
      'SequenceNode',
      [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]
    >;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => node('SequenceNode', sequence(token(_.Foo), token(_.Bar))),
    );

    it.each([
      {
        label: 'sequence as properties',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'SequenceNode',
              properties: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
              ],
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'sequence fails',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 3, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('node with parenthesized content', () => {
    type TestMatcherResult = AstNode<'ParenNode', { content: Token<TestTokenType.Foo> }>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        node(
          'ParenNode',
          struct(
            field(null, token(_.OpenParen)),
            field('content', token(_.Foo)),
            field(null, token(_.CloseParen)),
          ),
        ),
    );

    it.each([
      {
        label: 'parenthesized content',
        matcher: TestMatcher,
        input: '(foo)',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: 'ParenNode',
              properties: {
                content: {
                  type: TestTokenType.Foo,
                  location: { start: 1, end: 4 },
                },
              },
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
              ],
            },
            tokens: [
              { start: 0, end: 1 },
              { start: 1, end: 4 },
              { start: 4, end: 5 },
            ],
          },
        },
      },
      {
        label: 'missing opening paren',
        matcher: TestMatcher,
        input: 'foo)',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: OpenParen'),
            location: { start: 0, end: 3 },
          }),
        },
      },
      {
        label: 'missing closing paren',
        matcher: TestMatcher,
        input: '(foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: CloseParen'),
            location: { start: 4, end: 4 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
