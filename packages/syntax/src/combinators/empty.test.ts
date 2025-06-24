import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { choice } from './choice.ts';
import { empty } from './empty.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(empty, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
    },
    rules: (_) => ({}),
  });

  describe('basic empty', () => {
    type TestMatcherResult = null;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => empty<TestTokenType>(),
    );

    it.each([
      {
        label: 'empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: null,
            tokens: [],
          },
        },
      },
      {
        label: 'single token input',
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
      {
        label: 'multiple tokens input',
        matcher: TestMatcher,
        input: 'foobar',
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

  describe('empty in sequence', () => {
    type TestMatcherResult = [null, Token<TestTokenType.Foo>];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(empty<TestTokenType>(), token<TestTokenType, TestTokenType.Foo>(_.Foo)),
    );

    it.each([
      {
        label: 'empty followed by token',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
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
        label: 'empty but no token',
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
      {
        label: 'empty with extra tokens after',
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
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('token followed by empty', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(token<TestTokenType, TestTokenType.Foo>(_.Foo), empty<TestTokenType>()),
    );

    it.each([
      {
        label: 'token followed by empty',
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
              null,
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'token followed by empty with extra tokens',
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
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('multiple empty in sequence', () => {
    type TestMatcherResult = [null, null, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(empty<TestTokenType>(), empty<TestTokenType>(), empty<TestTokenType>()),
    );

    it.each([
      {
        label: 'multiple empty with empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: [null, null, null],
            tokens: [],
          },
        },
      },
      {
        label: 'multiple empty with tokens',
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

  describe('empty with optional', () => {
    type TestMatcherResult = [null, Token<TestTokenType.Foo> | null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(empty<TestTokenType>(), optional(token<TestTokenType, TestTokenType.Foo>(_.Foo))),
    );

    it.each([
      {
        label: 'empty with optional present',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
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
        label: 'empty with optional absent',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: [null, null],
            tokens: [],
          },
        },
      },
      {
        label: 'empty with optional and extra tokens',
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
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('empty in choice', () => {
    type TestMatcherResult = Token<TestTokenType.Foo> | null;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice<TestTokenType, [Token<TestTokenType.Foo>, null]>(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          empty<TestTokenType>(),
        ),
    );

    it.each([
      {
        label: 'choice with token available (should pick token)',
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
        label: 'choice with no token (should pick empty)',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: null,
            tokens: [],
          },
        },
      },
      {
        label: 'choice with wrong token (should pick empty but fail at eof)',
        matcher: TestMatcher,
        input: 'bar',
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

  describe('empty as second choice', () => {
    type TestMatcherResult = Token<TestTokenType.Bar> | null;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice<TestTokenType, [Token<TestTokenType.Bar>, null]>(
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
          empty<TestTokenType>(),
        ),
    );

    it.each([
      {
        label: 'second choice with matching token (should pick token)',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: TestTokenType.Bar,
              location: { start: 0, end: 3 },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'second choice with no token (should pick empty)',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: null,
            tokens: [],
          },
        },
      },
      {
        label: 'second choice with wrong token (should pick empty but fail at eof)',
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

  describe('complex empty scenarios', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, null, Token<TestTokenType.Bar>];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          empty<TestTokenType>(),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
        ),
    );

    it.each([
      {
        label: 'token, empty, token sequence',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              null,
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
        },
      },
      {
        label: 'incomplete sequence',
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
      {
        label: 'sequence with extra tokens',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 6, end: 9 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
