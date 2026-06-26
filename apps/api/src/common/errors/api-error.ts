import { HttpException, HttpStatus } from '@nestjs/common';

import type { ApiErrorBody } from '@mating/shared';

import type { ErrorCode } from './error-codes';

/**
 * Domain-friendly HTTP exception that always carries a stable {@link ErrorCode}.
 * Throw this from services/controllers to guarantee a consistent error contract.
 */
export class ApiError extends HttpException {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    const body: ApiErrorBody = { code, message, ...(details ? { details } : {}) };
    super(body, status);
    this.code = code;
    this.details = details;
  }
}
