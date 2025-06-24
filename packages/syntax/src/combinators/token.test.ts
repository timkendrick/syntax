import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { token } from './token.ts';

describe(token, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
    },
    rules: (_) => ({}),
  });

  type TestMatcherResult = Token<TestTokenType.Foo>;

  const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
    TestGrammar,
    (_) => ($) => token(_.Foo),
  );

  it.each([
    {
      label: 'single token input',
      matcher: TestMatcher,
      input: 'foo',
      expected: {
        type: ResultType.Success,
        value: {
          match: {
            type: TestTokenType.Foo,
            location: { start: 0, end: 3 },
          },
          tokens: [{ start: 0, end: 3 }],
        },
      },
    },
    {
      label: 'trailing tokens',
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
      label: 'non-matching token',
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
