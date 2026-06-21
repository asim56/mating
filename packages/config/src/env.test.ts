import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEnv } from './env';
import { z } from 'zod';

test('parseEnv returns validated config', () => {
  const schema = z.object({ FOO: z.string() });
  const result = parseEnv(schema, { FOO: 'bar' });
  assert.equal(result.FOO, 'bar');
});

test('parseEnv throws on invalid config', () => {
  const schema = z.object({ FOO: z.string() });
  assert.throws(() => parseEnv(schema, {}));
});
