import assert from 'node:assert/strict';
import test from 'node:test';

import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { IsString } from 'class-validator';

import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ApiError } from '../../src/common/errors/api-error';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { buildValidationPipe } from '../../src/common/pipes/validation.pipe';

function makeHost() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return body;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

test('filter serializes ApiError with stable code, message and details', () => {
  const filter = new AllExceptionsFilter();
  const { host, res } = makeHost();

  filter.catch(
    new ApiError(ERROR_CODES.CONFLICT, 'Already exists', HttpStatus.CONFLICT, { field: 'name' }),
    host,
  );

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, {
    code: 'CONFLICT',
    message: 'Already exists',
    details: { field: 'name' },
  });
});

test('filter maps framework HttpException to a default stable code', () => {
  const filter = new AllExceptionsFilter();
  const { host, res } = makeHost();

  filter.catch(new NotFoundException('Missing'), host);

  assert.equal(res.statusCode, 404);
  assert.equal((res.body as { code: string }).code, ERROR_CODES.NOT_FOUND);
});

test('filter maps unknown errors to 500 INTERNAL_ERROR without leaking details', () => {
  const filter = new AllExceptionsFilter();
  const { host, res } = makeHost();

  filter.catch(new Error('boom: secret detail'), host);

  assert.equal(res.statusCode, 500);
  assert.equal((res.body as { code: string }).code, ERROR_CODES.INTERNAL_ERROR);
  assert.equal((res.body as { message: string }).message, 'An unexpected error occurred.');
});

class SampleDto {
  @IsString()
  name!: string;
}

test('validation pipe rejects invalid payloads with VALIDATION_FAILED (400)', async () => {
  const pipe = buildValidationPipe();
  await assert.rejects(
    () => pipe.transform({ name: 123 }, { type: 'body', metatype: SampleDto, data: '' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.VALIDATION_FAILED);
      assert.equal(error.getStatus(), 400);
      return true;
    },
  );
});

test('validation pipe rejects unknown (non-whitelisted) fields', async () => {
  const pipe = buildValidationPipe();
  await assert.rejects(
    () =>
      pipe.transform(
        { name: 'ok', extra: 'nope' },
        { type: 'body', metatype: SampleDto, data: '' },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.VALIDATION_FAILED);
      return true;
    },
  );
});

test('validation pipe accepts and returns a valid payload', async () => {
  const pipe = buildValidationPipe();
  const result = (await pipe.transform(
    { name: 'ok' },
    { type: 'body', metatype: SampleDto, data: '' },
  )) as SampleDto;
  assert.ok(result instanceof SampleDto);
  assert.equal(result.name, 'ok');
});
