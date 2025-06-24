import { expect, test } from 'vitest';

import * as lib from './lib.ts';

test('module exports', () => {
  expect({ ...lib }).toEqual({
    codegen: lib.codegen,
  });
});
