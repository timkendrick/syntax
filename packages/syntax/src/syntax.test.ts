import { describe, expect, it } from 'vitest';

import type { AnyAstNode } from './grammar.ts';
import { ResultType, type Result } from './result.ts';
import { syntax } from './syntax.ts';

describe(syntax, () => {
  describe('basic grammar', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      <Foo> ::= {
        bar: <- FOO
      }
    `);

    it.each([
      {
        label: 'match',
        grammar: TestGrammar,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              bar: 'foo',
            },
            tokens: expect.any(Array),
          },
        } satisfies Result<AnyAstNode, Error>,
      },
      {
        label: 'no match',
        grammar: TestGrammar,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: FOO'),
            location: { start: 0, end: 3 },
          }),
        } satisfies Result<AnyAstNode, Error>,
      },
      {
        label: 'invalid token',
        grammar: TestGrammar,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Unrecognized token'),
            location: { start: 0, end: 1 },
          }),
        } satisfies Result<AnyAstNode, Error>,
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });

  describe('multiple nodes', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      <Foo> ::= {
        bar: <Bar>
      }
      <Bar> ::= {
        value: <- FOO
      }
    `);

    it.each([
      {
        label: 'match',
        grammar: TestGrammar,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              bar: {
                type: 'Bar',
                properties: {
                  value: 'foo',
                },
                tokens: expect.any(Array),
              },
            },
            tokens: expect.any(Array),
          },
        } satisfies Result<AnyAstNode, Error>,
      },
      {
        label: 'no match',
        grammar: TestGrammar,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: FOO'),
            location: { start: 0, end: 3 },
          }),
        } satisfies Result<AnyAstNode, Error>,
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });

  describe('multiple properties', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      BAZ ::= "baz"
      <Foo> ::= {
        foo: <- FOO,
        bar: <- BAR,
        baz: <- BAZ
      }
    `);

    it.each([
      {
        label: 'match all properties',
        grammar: TestGrammar,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              foo: 'foo',
              bar: 'bar',
              baz: 'baz',
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'partial match',
        grammar: TestGrammar,
        input: 'foobar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: BAZ'),
            location: { start: 6, end: 6 },
          }),
        },
      },
      {
        label: 'no match',
        grammar: TestGrammar,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: FOO'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });

  describe('alternative properties', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      BAZ ::= "baz"
      <Foo> ::= {
        value: <- FOO | BAR,
        foo: <- FOO,
        bar: <- BAR
      }
    `);

    it.each([
      {
        label: 'match first alternative',
        grammar: TestGrammar,
        input: 'foofoobar',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              value: 'foo',
              foo: 'foo',
              bar: 'bar',
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'match second alternative',
        grammar: TestGrammar,
        input: 'barfoobar',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              value: 'bar',
              foo: 'foo',
              bar: 'bar',
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'no match',
        grammar: TestGrammar,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: FOO'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });

  describe('regular expression tokens', () => {
    describe('simple regular expression', () => {
      const TestGrammar = syntax(`
        FOO_BAR ::= /foo|bar/
        BAZ ::= "baz"
        <Foo> ::= {
          value: <- FOO_BAR
        }
      `);

      it.each([
        {
          label: 'match first alternative',
          grammar: TestGrammar,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'foo',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'match second alternative',
          grammar: TestGrammar,
          input: 'bar',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'bar',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'baz',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO_BAR'),
              location: { start: 0, end: 3 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });

    describe('complex regular expression', () => {
      const TestGrammar = syntax(`
        STRING ::= /"(?:[^"\\\\\\n]|\\\\.)*"/
        FOO ::= "foo"
        <Foo> ::= {
          value: <- STRING
        }
      `);

      it.each([
        {
          label: 'match simple string',
          grammar: TestGrammar,
          input: '"foo"',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: '"foo"',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'match escaped string',
          grammar: TestGrammar,
          input: JSON.stringify('foo "bar" baz'),
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: JSON.stringify('foo "bar" baz'),
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: STRING'),
              location: { start: 0, end: 3 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });
  });

  describe('sequence', () => {
    describe('2 elements', () => {
      const TestGrammar = syntax(`
        FOO ::= "foo"
        BAR ::= "bar"
        <Foo> ::= {
          value: <- FOO BAR
        }
      `);

      it.each([
        {
          label: 'match',
          grammar: TestGrammar,
          input: 'foobar',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'foobar',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'partial match',
          grammar: TestGrammar,
          input: 'foo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: BAR'),
              location: { start: 3, end: 3 },
            }),
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'barfoo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 3 },
            }),
          },
        },
        {
          label: 'empty input',
          grammar: TestGrammar,
          input: '',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 0 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });

    describe('3 elements', () => {
      const TestGrammar = syntax(`
        FOO ::= "foo"
        BAR ::= "bar"
        BAZ ::= "baz"
        <Foo> ::= {
          value: <- FOO BAR BAZ
        }
      `);

      it.each([
        {
          label: 'match',
          grammar: TestGrammar,
          input: 'foobarbaz',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'foobarbaz',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'partial match',
          grammar: TestGrammar,
          input: 'foobar',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: BAZ'),
              location: { start: 6, end: 6 },
            }),
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'bazbarfoo',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 3 },
            }),
          },
        },
        {
          label: 'empty input',
          grammar: TestGrammar,
          input: '',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 0 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });
  });

  describe('choice', () => {
    describe('2 alternatives', () => {
      const TestGrammar = syntax(`
        FOO ::= "foo"
        BAR ::= "bar"
        BAZ ::= "baz"
        <Foo> ::= {
          value: <- FOO | BAR
        }
      `);

      it.each([
        {
          label: 'match first alternative',
          grammar: TestGrammar,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'foo',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'match second alternative',
          grammar: TestGrammar,
          input: 'bar',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'bar',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'baz',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 3 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });

    describe('3 alternatives', () => {
      const TestGrammar = syntax(`
        FOO ::= "foo"
        BAR ::= "bar"
        BAZ ::= "baz"
        QUX ::= "qux"
        <Foo> ::= {
          value: <- FOO | BAR | BAZ
        }
      `);

      it.each([
        {
          label: 'match first alternative',
          grammar: TestGrammar,
          input: 'foo',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'foo',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'match second alternative',
          grammar: TestGrammar,
          input: 'bar',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'bar',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'match third alternative',
          grammar: TestGrammar,
          input: 'baz',
          expected: {
            type: ResultType.Success,
            value: {
              type: 'Foo',
              properties: {
                value: 'baz',
              },
              tokens: expect.any(Array),
            },
          },
        },
        {
          label: 'no match',
          grammar: TestGrammar,
          input: 'qux',
          expected: {
            type: ResultType.Error,
            error: expect.objectContaining({
              message: expect.stringContaining('Expected token: FOO'),
              location: { start: 0, end: 3 },
            }),
          },
        },
      ])('$label: $input', ({ grammar, input, expected }) => {
        if (expected.type === ResultType.Error) {
          expect(() => grammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = grammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      });
    });
  });

  describe('list', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      <Foo> ::= {
        items: [<item>, BAR]
      }
      <item> ::= <- FOO
    `);

    it.each([
      {
        label: 'match empty list',
        grammar: TestGrammar,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              items: [],
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'match 1 list item',
        grammar: TestGrammar,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              items: ['foo'],
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'match 2 list items',
        grammar: TestGrammar,
        input: 'foobarfoo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              items: ['foo', 'foo'],
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'match 3 list items',
        grammar: TestGrammar,
        input: 'foobarfoobarfoo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              items: ['foo', 'foo', 'foo'],
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'partial match',
        grammar: TestGrammar,
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
        label: 'no match',
        grammar: TestGrammar,
        input: 'barfoo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });

  describe('optional tokens', () => {
    const TestGrammar = syntax(`
      FOO ::= "foo"
      BAR ::= "bar"
      BAZ ::= "baz"
      <Foo> ::= {
        foo: <- FOO,
        bar: <- <optional_bar>
      }
      <optional_bar> ::= BAR | ""
    `);

    it.each([
      {
        label: 'match specified',
        grammar: TestGrammar,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              foo: 'foo',
              bar: 'bar',
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'match unspecified',
        grammar: TestGrammar,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            type: 'Foo',
            properties: {
              foo: 'foo',
              bar: '',
            },
            tokens: expect.any(Array),
          },
        },
      },
      {
        label: 'no match',
        grammar: TestGrammar,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: FOO'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ grammar, input, expected }) => {
      if (expected.type === ResultType.Error) {
        expect(() => grammar.parse(input)).toThrow(expected.error);
      } else {
        const actual = grammar.parse(input);
        expect(actual).toEqual(expected.value);
      }
    });
  });
});
