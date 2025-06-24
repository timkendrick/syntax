import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { choice } from './choice.ts';
import { oneOrMore } from './oneOrMore.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { text } from './text.ts';
import { token } from './token.ts';
import { zeroOrMore } from './zeroOrMore.ts';

describe(text, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
    Symbol = 'Symbol',
    Number = 'Number',
    Whitespace = 'Whitespace',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
      [TestTokenType.Symbol]: /[a-zA-Z_][a-zA-Z0-9_]*/,
      [TestTokenType.Number]: /\d+/,
      [TestTokenType.Whitespace]: /\s+/,
    },
    rules: (_) => ({}),
  });

  describe('basic text extraction', () => {
    type TestMatcherResult = string;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => text(token(_.Foo)),
    );

    it.each([
      {
        label: 'extract text from foo token',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'foo',
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'wrong token type',
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

  describe('text extraction from different token types', () => {
    type TestMatcherResult = string;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => text(token(_.Symbol)),
    );

    it.each([
      {
        label: 'simple identifier',
        matcher: TestMatcher,
        input: 'hello',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'hello',
            tokens: [{ start: 0, end: 5 }],
          },
        },
      },
      {
        label: 'identifier with underscores',
        matcher: TestMatcher,
        input: 'hello_world',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'hello_world',
            tokens: [{ start: 0, end: 11 }],
          },
        },
      },
      {
        label: 'identifier with numbers',
        matcher: TestMatcher,
        input: 'var123',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'var123',
            tokens: [{ start: 0, end: 6 }],
          },
        },
      },
      {
        label: 'single character',
        matcher: TestMatcher,
        input: 'x',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'x',
            tokens: [{ start: 0, end: 1 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });

    describe('whitespace extraction', () => {
      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) => text(token(_.Whitespace)),
      );

      it.each([
        {
          label: 'single space',
          matcher: TestMatcher,
          input: ' ',
          expected: {
            type: ResultType.Success,
            value: {
              match: ' ',
              tokens: [{ start: 0, end: 1 }],
            },
          },
        },
        {
          label: 'multiple spaces',
          matcher: TestMatcher,
          input: '   ',
          expected: {
            type: ResultType.Success,
            value: {
              match: '   ',
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
        {
          label: 'tab character',
          matcher: TestMatcher,
          input: '\t',
          expected: {
            type: ResultType.Success,
            value: {
              match: '\t',
              tokens: [{ start: 0, end: 1 }],
            },
          },
        },
        {
          label: 'newline character',
          matcher: TestMatcher,
          input: '\n',
          expected: {
            type: ResultType.Success,
            value: {
              match: '\n',
              tokens: [{ start: 0, end: 1 }],
            },
          },
        },
        {
          label: 'mixed whitespace',
          matcher: TestMatcher,
          input: ' \t\n ',
          expected: {
            type: ResultType.Success,
            value: {
              match: ' \t\n ',
              tokens: [{ start: 0, end: 4 }],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('text with extra input', () => {
    type TestMatcherResult = string;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => text(token(_.Foo)),
    );

    it.each([
      {
        label: 'text followed by extra tokens',
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
        label: 'text followed by whitespace',
        matcher: TestMatcher,
        input: 'foo ',
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

  describe('edge cases', () => {
    describe('empty string patterns', () => {
      const EmptyTokenGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
        tokens: {
          [TestTokenType.Foo]: '',
          [TestTokenType.Bar]: 'bar',
          [TestTokenType.Baz]: 'baz',
          [TestTokenType.Symbol]: /[a-zA-Z_][a-zA-Z0-9_]*/,
          [TestTokenType.Number]: /\d+/,
          [TestTokenType.Whitespace]: /\s+/,
        },
        rules: (_) => ({}),
      });

      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        EmptyTokenGrammar,
        (_) => ($) => text(optional(token(_.Foo))),
      );

      it.each([
        {
          label: 'empty string token',
          matcher: TestMatcher,
          input: '',
          expected: {
            type: ResultType.Success,
            value: {
              match: '',
              tokens: [],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('unicode and special characters', () => {
      const UnicodeTokenGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
        tokens: {
          [TestTokenType.Foo]: 'foo',
          [TestTokenType.Bar]: 'bar',
          [TestTokenType.Baz]: 'baz',
          [TestTokenType.Symbol]: /.+/,
          [TestTokenType.Number]: /\d+/,
          [TestTokenType.Whitespace]: /\s+/,
        },
        rules: (_) => ({}),
      });

      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        UnicodeTokenGrammar,
        (_) => ($) => text(token(_.Symbol)),
      );

      it.each([
        {
          label: 'unicode characters',
          matcher: TestMatcher,
          input: 'héllo',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'héllo',
              tokens: [{ start: 0, end: 5 }],
            },
          },
        },
        {
          label: 'emoji',
          matcher: TestMatcher,
          input: '🚀',
          expected: {
            type: ResultType.Success,
            value: {
              match: '🚀',
              tokens: [{ start: 0, end: 2 }],
            },
          },
        },
        {
          label: 'special characters',
          matcher: TestMatcher,
          input: '@#$%',
          expected: {
            type: ResultType.Success,
            value: {
              match: '@#$%',
              tokens: [{ start: 0, end: 4 }],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('multi-token text extraction', () => {
    describe('sequence patterns', () => {
      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          text(
            sequence(
              token(_.Foo),
              zeroOrMore(
                sequence(
                  token<TestTokenType, TestTokenType.Bar>(_.Bar),
                  token<TestTokenType, TestTokenType.Foo>(_.Foo),
                ),
              ),
              optional(token(_.Baz)),
            ),
          ),
      );

      it.each([
        {
          label: 'minimal pattern (foo)',
          matcher: TestMatcher,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foo',
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
        {
          label: 'pattern with optional ending (foo + baz)',
          matcher: TestMatcher,
          input: 'foobaz',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foobaz',
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
              ],
            },
          },
        },
        {
          label: 'pattern with repetition (foo + bar + foo)',
          matcher: TestMatcher,
          input: 'foobarfoo',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foobarfoo',
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
                { start: 6, end: 9 },
              ],
            },
          },
        },
        {
          label: 'complex pattern with repetition and optional',
          matcher: TestMatcher,
          input: 'foobarfoobarfoobaz',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foobarfoobarfoobaz',
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

    describe('choice patterns', () => {
      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) =>
          text(
            choice(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              token<TestTokenType, TestTokenType.Bar>(_.Bar),
            ),
          ),
      );

      it.each([
        {
          label: 'first choice matches',
          matcher: TestMatcher,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foo',
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
        {
          label: 'second choice matches',
          matcher: TestMatcher,
          input: 'bar',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'bar',
              tokens: [{ start: 0, end: 3 }],
            },
          },
        },
      ])('$label: $input', ({ matcher, input, expected }) => {
        const actual = matcher(input);
        expect(actual).toEqual(expected);
      });
    });

    describe('repetition patterns', () => {
      describe('zeroOrMore', () => {
        type TestMatcherResult = string;

        const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
          TestGrammar,
          (_) => ($) => text(zeroOrMore(token(_.Foo))),
        );

        it.each([
          {
            label: 'zero repetitions',
            matcher: TestMatcher,
            input: '',
            expected: {
              type: ResultType.Success,
              value: {
                match: '',
                tokens: [],
              },
            },
          },
          {
            label: 'one repetition',
            matcher: TestMatcher,
            input: 'foo',
            expected: {
              type: ResultType.Success,
              value: {
                match: 'foo',
                tokens: [{ start: 0, end: 3 }],
              },
            },
          },
          {
            label: 'multiple repetitions',
            matcher: TestMatcher,
            input: 'foofoofoo',
            expected: {
              type: ResultType.Success,
              value: {
                match: 'foofoofoo',
                tokens: [
                  { start: 0, end: 3 },
                  { start: 3, end: 6 },
                  { start: 6, end: 9 },
                ],
              },
            },
          },
        ])('$label: $input', ({ matcher, input, expected }) => {
          const actual = matcher(input);
          expect(actual).toEqual(expected);
        });
      });

      describe('oneOrMore', () => {
        type TestMatcherResult = string;

        const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
          TestGrammar,
          (_) => ($) => text(oneOrMore(token(_.Foo))),
        );

        it.each([
          {
            label: 'one repetition',
            matcher: TestMatcher,
            input: 'foo',
            expected: {
              type: ResultType.Success,
              value: {
                match: 'foo',
                tokens: [{ start: 0, end: 3 }],
              },
            },
          },
          {
            label: 'multiple repetitions',
            matcher: TestMatcher,
            input: 'foofoofoo',
            expected: {
              type: ResultType.Success,
              value: {
                match: 'foofoofoo',
                tokens: [
                  { start: 0, end: 3 },
                  { start: 3, end: 6 },
                  { start: 6, end: 9 },
                ],
              },
            },
          },
          {
            label: 'zero repetitions',
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
    });

    describe('mixed token types', () => {
      type TestMatcherResult = string;

      const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
        TestGrammar,
        (_) => ($) => text(sequence(token(_.Foo), token(_.Number), optional(token(_.Whitespace)))),
      );

      it.each([
        {
          label: 'foo + number',
          matcher: TestMatcher,
          input: 'foo123',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foo123',
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
              ],
            },
          },
        },
        {
          label: 'foo + number + whitespace',
          matcher: TestMatcher,
          input: 'foo123 ',
          expected: {
            type: ResultType.Success,
            value: {
              match: 'foo123 ',
              tokens: [
                { start: 0, end: 3 },
                { start: 3, end: 6 },
                { start: 6, end: 7 },
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
});
