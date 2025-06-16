import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { oneOrMore } from './oneOrMore.ts';
import { token } from './token.ts';

describe(oneOrMore, () => {
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

  describe('basic oneOrMore', () => {
    type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => oneOrMore(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
    );

    it.each([
      {
        label: 'one match',
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
        label: 'multiple matches',
        matcher: TestMatcher,
        input: 'foofoofoo',
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
                location: { start: 3, end: 6 },
              },
              {
                type: TestTokenType.Foo,
                location: { start: 6, end: 9 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'single match followed by unexpected tokens',
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
        label: 'no matches',
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

  describe('oneOrMore with different token types', () => {
    type TestMatcherResult = Array<Token<TestTokenType.Bar>>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => oneOrMore(token<TestTokenType, TestTokenType.Bar>(_.Bar)),
    );

    it.each([
      {
        label: 'single bar token',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'multiple bar tokens',
        matcher: TestMatcher,
        input: 'barbarbar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 6, end: 9 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'wrong token type',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('oneOrMore edge cases', () => {
    type TestMatcherResult = Array<Token<TestTokenType.Foo>>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => oneOrMore(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
    );

    it.each([
      {
        label: 'exactly one token',
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
        label: 'many tokens',
        matcher: TestMatcher,
        input: 'foofoofoofoofoofoo',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              { type: TestTokenType.Foo, location: { start: 0, end: 3 } },
              { type: TestTokenType.Foo, location: { start: 3, end: 6 } },
              { type: TestTokenType.Foo, location: { start: 6, end: 9 } },
              { type: TestTokenType.Foo, location: { start: 9, end: 12 } },
              { type: TestTokenType.Foo, location: { start: 12, end: 15 } },
              { type: TestTokenType.Foo, location: { start: 15, end: 18 } },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
              { start: 9, end: 12 },
              { start: 12, end: 15 },
              { start: 15, end: 18 },
            ],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
