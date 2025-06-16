import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { choice } from './choice.ts';
import { list } from './list.ts';
import { sequence } from './sequence.ts';
import { field, struct } from './struct.ts';
import { token } from './token.ts';

describe(list, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
    Comma = 'Comma',
    Semicolon = 'Semicolon',
    OpenParen = 'OpenParen',
    CloseParen = 'CloseParen',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
      [TestTokenType.Comma]: ',',
      [TestTokenType.Semicolon]: ';',
      [TestTokenType.OpenParen]: '(',
      [TestTokenType.CloseParen]: ')',
    },
    rules: (_) => ({}),
  });

  describe('no minLength', () => {
    describe('basic list with single token items', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
          ),
      );

      it.each([
        {
          label: 'empty list',
          matcher: TestMatcher,
          input: '',
          expected: {
            type: ResultType.Success,
            value: {
              match: [],
              tokens: [],
            },
          },
        },
        {
          label: 'single item',
          matcher: TestMatcher,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
              ],
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
        {
          label: 'two items',
          matcher: TestMatcher,
          input: 'foo,foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
              ],
            },
          },
        },
        {
          label: 'three items',
          matcher: TestMatcher,
          input: 'foo,foo,foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
              ],
            },
          },
        },
        {
          label: 'trailing separator',
          matcher: TestMatcher,
          input: 'foo,',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
        {
          label: 'leading separator',
          matcher: TestMatcher,
          input: ',foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 0, end: 1 },
            }),
          },
        },
        {
          label: 'double separator',
          matcher: TestMatcher,
          input: 'foo,,foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('list with different separators', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Semicolon>(_.Semicolon),
          ),
      );

      it.each([
        {
          label: 'semicolon separated list',
          matcher: TestMatcher,
          input: 'foo;foo;foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
              ],
            },
          },
        },
        {
          label: 'wrong separator',
          matcher: TestMatcher,
          input: 'foo,foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('list with mixed item types', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo> | Token<TestTokenType.Bar>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            choice<TestTokenType, [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              token<TestTokenType, TestTokenType.Bar>(_.Bar),
            ),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
          ),
      );

      it.each([
        {
          label: 'mixed foo and bar items',
          matcher: TestMatcher,
          input: 'foo,bar,foo,bar',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 12, end: 15 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 12 },
                { start: 12, end: 15 },
              ],
            },
          },
        },
        {
          label: 'invalid item type',
          matcher: TestMatcher,
          input: 'foo,baz',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('list with complex items', () => {
      type TestMatcherResult = [
        Token<TestTokenType.OpenParen>,
        Array<[Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>,
        Token<TestTokenType.CloseParen>,
      ];

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          sequence(
            token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen),
            list(
              sequence<TestTokenType, [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>(
                token<TestTokenType, TestTokenType.Foo>(_.Foo),
                token<TestTokenType, TestTokenType.Bar>(_.Bar),
              ),
              token<TestTokenType, TestTokenType.Comma>(_.Comma),
            ),
            token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen),
          ),
      );

      it.each([
        {
          label: 'list of sequences',
          matcher: TestMatcher,
          input: '(foobar,foobar)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                    {
                      type: TestTokenType.Bar,
                      location: { start: 4, end: 7 },
                    },
                  ],
                  [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 8, end: 11 },
                    },
                    {
                      type: TestTokenType.Bar,
                      location: { start: 11, end: 14 },
                    },
                  ],
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 14, end: 15 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 14 },
                { start: 14, end: 15 },
              ],
            },
          },
        },
        {
          label: 'incomplete sequence item',
          matcher: TestMatcher,
          input: '(foo,foobar)',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: CloseParen'),
              location: { start: 1, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('list with struct items', () => {
      type TestMatcherResult = Array<{
        name: Token<TestTokenType.Foo>;
        value: Token<TestTokenType.Bar>;
      }>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            struct<
              TestTokenType,
              { name: Token<TestTokenType.Foo>; value: Token<TestTokenType.Bar> }
            >(
              field('name', token<TestTokenType, TestTokenType.Foo>(_.Foo)),
              field('value', token<TestTokenType, TestTokenType.Bar>(_.Bar)),
            ),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
          ),
      );

      it.each([
        {
          label: 'list of structs',
          matcher: TestMatcher,
          input: 'foobar,foobar',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  name: {
                    type: TestTokenType.Foo,
                    location: { start: 0, end: 3 },
                  },
                  value: {
                    type: TestTokenType.Bar,
                    location: { start: 3, end: 6 },
                  },
                },
                {
                  name: {
                    type: TestTokenType.Foo,
                    location: { start: 7, end: 10 },
                  },
                  value: {
                    type: TestTokenType.Bar,
                    location: { start: 10, end: 13 },
                  },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
                { start: 6, end: 7 },
                { start: 7, end: 10 },
                { start: 10, end: 13 },
              ],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('list with complex separators', () => {
      type TestMatcherResult = [
        Token<TestTokenType.OpenParen>,
        Array<Token<TestTokenType.Foo>>,
        Token<TestTokenType.CloseParen>,
      ];

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          sequence(
            token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen),
            list(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              sequence<TestTokenType, [Token<TestTokenType.Comma>, Token<TestTokenType.Bar>]>(
                token<TestTokenType, TestTokenType.Comma>(_.Comma),
                token<TestTokenType, TestTokenType.Bar>(_.Bar),
              ),
            ),
            token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen),
          ),
      );

      it.each([
        {
          label: 'complex separator sequence',
          matcher: TestMatcher,
          input: '(foo,barfoo,barfoo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  {
                    type: TestTokenType.Foo,
                    location: { start: 1, end: 4 },
                  },
                  {
                    type: TestTokenType.Foo,
                    location: { start: 8, end: 11 },
                  },
                  {
                    type: TestTokenType.Foo,
                    location: { start: 15, end: 18 },
                  },
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 18, end: 19 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
                { start: 5, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 12 },
                { start: 12, end: 15 },
                { start: 15, end: 18 },
                { start: 18, end: 19 },
              ],
            },
          },
        },
        {
          label: 'incomplete complex separator',
          matcher: TestMatcher,
          input: '(foo,foo)',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: CloseParen'),
              location: { start: 4, end: 5 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('nested lists', () => {
      type TestMatcherResult = Array<{ items: Array<Token<TestTokenType.Foo>> }>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            struct<TestTokenType, { items: Array<Token<TestTokenType.Foo>> }>(
              field(null, token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen)),
              field(
                'items',
                list(
                  token<TestTokenType, TestTokenType.Foo>(_.Foo),
                  token<TestTokenType, TestTokenType.Comma>(_.Comma),
                ),
              ),
              field(null, token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen)),
            ),
            token<TestTokenType, TestTokenType.Semicolon>(_.Semicolon),
          ),
      );

      it.each([
        {
          label: 'nested lists',
          matcher: TestMatcher,
          input: '(foo,foo);(foo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  items: [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                    {
                      type: TestTokenType.Foo,
                      location: { start: 5, end: 8 },
                    },
                  ],
                },
                {
                  items: [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 11, end: 14 },
                    },
                  ],
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
                { start: 5, end: 8 },
                { start: 8, end: 9 },
                { start: 9, end: 10 },
                { start: 10, end: 11 },
                { start: 11, end: 14 },
                { start: 14, end: 15 },
              ],
            },
          },
        },
        {
          label: 'empty nested lists',
          matcher: TestMatcher,
          input: '();()',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  items: [],
                },
                {
                  items: [],
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 2 },
                { start: 2, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 5 },
              ],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('edge cases', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
          ),
      );

      it.each([
        {
          label: 'single item with extra input',
          matcher: TestMatcher,
          input: 'foobar',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 6 },
            }),
          },
        },
        {
          label: 'separator only',
          matcher: TestMatcher,
          input: ',',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 0, end: 1 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('minLength: 1', () => {
    describe('basic non-empty list with single token items', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
            { minLength: 1 },
          ),
      );

      it.each([
        {
          label: 'empty list',
          matcher: TestMatcher,
          input: '',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
        {
          label: 'single item',
          matcher: TestMatcher,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
              ],
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
        {
          label: 'two items',
          matcher: TestMatcher,
          input: 'foo,foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
              ],
            },
          },
        },
        {
          label: 'three items',
          matcher: TestMatcher,
          input: 'foo,foo,foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
              ],
            },
          },
        },
        {
          label: 'trailing separator',
          matcher: TestMatcher,
          input: 'foo,',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
        {
          label: 'leading separator',
          matcher: TestMatcher,
          input: ',foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
        {
          label: 'double separator',
          matcher: TestMatcher,
          input: 'foo,,foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('non-empty list with different separators', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Semicolon>(_.Semicolon),
            { minLength: 1 },
          ),
      );

      it.each([
        {
          label: 'semicolon separated list',
          matcher: TestMatcher,
          input: 'foo;foo;foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
              ],
            },
          },
        },
        {
          label: 'wrong separator',
          matcher: TestMatcher,
          input: 'foo,foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('non-empty list with mixed item types', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo> | Token<TestTokenType.Bar>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            choice<TestTokenType, [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              token<TestTokenType, TestTokenType.Bar>(_.Bar),
            ),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
            { minLength: 1 },
          ),
      );

      it.each([
        {
          label: 'mixed foo and bar items',
          matcher: TestMatcher,
          input: 'foo,bar,foo,bar',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 4, end: 7 },
                },
                {
                  type: TestTokenType.Foo,
                  location: { start: 8, end: 11 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 12, end: 15 },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 12 },
                { start: 12, end: 15 },
              ],
            },
          },
        },
        {
          label: 'invalid item type',
          matcher: TestMatcher,
          input: 'foo,baz',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 4 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('non-empty list with complex items', () => {
      type TestMatcherResult = [
        Token<TestTokenType.OpenParen>,
        Array<[Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>,
        Token<TestTokenType.CloseParen>,
      ];

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          sequence(
            token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen),
            list(
              sequence<TestTokenType, [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>]>(
                token<TestTokenType, TestTokenType.Foo>(_.Foo),
                token<TestTokenType, TestTokenType.Bar>(_.Bar),
              ),
              token<TestTokenType, TestTokenType.Comma>(_.Comma),
              { minLength: 1 },
            ),
            token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen),
          ),
      );

      it.each([
        {
          label: 'non-empty list of sequences',
          matcher: TestMatcher,
          input: '(foobar,foobar)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                    {
                      type: TestTokenType.Bar,
                      location: { start: 4, end: 7 },
                    },
                  ],
                  [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 8, end: 11 },
                    },
                    {
                      type: TestTokenType.Bar,
                      location: { start: 11, end: 14 },
                    },
                  ],
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 14, end: 15 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 14 },
                { start: 14, end: 15 },
              ],
            },
          },
        },
        {
          label: 'single sequence item',
          matcher: TestMatcher,
          input: '(foobar)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                    {
                      type: TestTokenType.Bar,
                      location: { start: 4, end: 7 },
                    },
                  ],
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 7, end: 8 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 7 },
                { start: 7, end: 8 },
              ],
            },
          },
        },
        {
          label: 'empty parentheses',
          matcher: TestMatcher,
          input: '()',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
        {
          label: 'incomplete sequence item',
          matcher: TestMatcher,
          input: '(foo,foobar)',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: Bar'),
              location: { start: 4, end: 5 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('non-empty list with struct items', () => {
      type TestMatcherResult = Array<{
        name: Token<TestTokenType.Foo>;
        value: Token<TestTokenType.Bar>;
      }>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            struct<
              TestTokenType,
              { name: Token<TestTokenType.Foo>; value: Token<TestTokenType.Bar> }
            >(
              field('name', token<TestTokenType, TestTokenType.Foo>(_.Foo)),
              field('value', token<TestTokenType, TestTokenType.Bar>(_.Bar)),
            ),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
            { minLength: 1 },
          ),
      );

      it.each([
        {
          label: 'non-empty list of structs',
          matcher: TestMatcher,
          input: 'foobar,foobar',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  name: {
                    type: TestTokenType.Foo,
                    location: { start: 0, end: 3 },
                  },
                  value: {
                    type: TestTokenType.Bar,
                    location: { start: 3, end: 6 },
                  },
                },
                {
                  name: {
                    type: TestTokenType.Foo,
                    location: { start: 7, end: 10 },
                  },
                  value: {
                    type: TestTokenType.Bar,
                    location: { start: 10, end: 13 },
                  },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
                { start: 6, end: 7 },
                { start: 7, end: 10 },
                { start: 10, end: 13 },
              ],
            },
          },
        },
        {
          label: 'single struct item',
          matcher: TestMatcher,
          input: 'foobar',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  name: {
                    type: TestTokenType.Foo,
                    location: { start: 0, end: 3 },
                  },
                  value: {
                    type: TestTokenType.Bar,
                    location: { start: 3, end: 6 },
                  },
                },
              ],
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
              ],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('non-empty list with complex separators', () => {
      type TestMatcherResult = [
        Token<TestTokenType.OpenParen>,
        Array<Token<TestTokenType.Foo>>,
        Token<TestTokenType.CloseParen>,
      ];

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          sequence(
            token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen),
            list(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              sequence<TestTokenType, [Token<TestTokenType.Comma>, Token<TestTokenType.Bar>]>(
                token<TestTokenType, TestTokenType.Comma>(_.Comma),
                token<TestTokenType, TestTokenType.Bar>(_.Bar),
              ),
              { minLength: 1 },
            ),
            token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen),
          ),
      );

      it.each([
        {
          label: 'complex separator sequence',
          matcher: TestMatcher,
          input: '(foo,barfoo,barfoo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  {
                    type: TestTokenType.Foo,
                    location: { start: 1, end: 4 },
                  },
                  {
                    type: TestTokenType.Foo,
                    location: { start: 8, end: 11 },
                  },
                  {
                    type: TestTokenType.Foo,
                    location: { start: 15, end: 18 },
                  },
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 18, end: 19 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
                { start: 5, end: 8 },
                { start: 8, end: 11 },
                { start: 11, end: 12 },
                { start: 12, end: 15 },
                { start: 15, end: 18 },
                { start: 18, end: 19 },
              ],
            },
          },
        },
        {
          label: 'single item with complex separator context',
          matcher: TestMatcher,
          input: '(foo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  type: TestTokenType.OpenParen,
                  location: { start: 0, end: 1 },
                },
                [
                  {
                    type: TestTokenType.Foo,
                    location: { start: 1, end: 4 },
                  },
                ],
                {
                  type: TestTokenType.CloseParen,
                  location: { start: 4, end: 5 },
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
              ],
            },
          },
        },
        {
          label: 'incomplete complex separator',
          matcher: TestMatcher,
          input: '(foo,foo)',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: CloseParen'),
              location: { start: 4, end: 5 },
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('nested non-empty lists', () => {
      type TestMatcherResult = Array<{ items: Array<Token<TestTokenType.Foo>> }>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            struct<TestTokenType, { items: Array<Token<TestTokenType.Foo>> }>(
              field(null, token<TestTokenType, TestTokenType.OpenParen>(_.OpenParen)),
              field(
                'items',
                list(
                  token<TestTokenType, TestTokenType.Foo>(_.Foo),
                  token<TestTokenType, TestTokenType.Comma>(_.Comma),
                  { minLength: 1 },
                ),
              ),
              field(null, token<TestTokenType, TestTokenType.CloseParen>(_.CloseParen)),
            ),
            token<TestTokenType, TestTokenType.Semicolon>(_.Semicolon),
          ),
      );

      it.each([
        {
          label: 'nested non-empty lists',
          matcher: TestMatcher,
          input: '(foo,foo);(foo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  items: [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                    {
                      type: TestTokenType.Foo,
                      location: { start: 5, end: 8 },
                    },
                  ],
                },
                {
                  items: [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 11, end: 14 },
                    },
                  ],
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
                { start: 5, end: 8 },
                { start: 8, end: 9 },
                { start: 9, end: 10 },
                { start: 10, end: 11 },
                { start: 11, end: 14 },
                { start: 14, end: 15 },
              ],
            },
          },
        },
        {
          label: 'single nested list',
          matcher: TestMatcher,
          input: '(foo)',
          expected: {
            type: ResultType.Success,
            value: {
              match: [
                {
                  items: [
                    {
                      type: TestTokenType.Foo,
                      location: { start: 1, end: 4 },
                    },
                  ],
                },
              ],
              tokens: [
                { start: 0, end: 1 },
                { start: 1, end: 4 },
                { start: 4, end: 5 },
              ],
            },
          },
        },
        {
          label: 'empty nested lists',
          matcher: TestMatcher,
          input: '();()',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('edge cases', () => {
      type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          list(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Comma>(_.Comma),
            { minLength: 1 },
          ),
      );

      it.each([
        {
          label: 'single item with extra input',
          matcher: TestMatcher,
          input: 'foobar',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected end of input'),
              location: { start: 3, end: 6 },
            }),
          },
        },
        {
          label: 'separator only',
          matcher: TestMatcher,
          input: ',',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
        {
          label: 'multiple separators only',
          matcher: TestMatcher,
          input: ',,,',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.any(String),
            }),
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });
  });
});
