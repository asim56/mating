import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';

import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';

function flattenValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  const visit = (error: ValidationError, path: string): void => {
    const property = path ? `${path}.${error.property}` : error.property;
    if (error.constraints) {
      result[property] = Object.values(error.constraints);
    }
    error.children?.forEach((child) => visit(child, property));
  };

  errors.forEach((error) => visit(error, ''));
  return result;
}

/**
 * Standard validation pipe used globally. Unknown fields are stripped
 * (whitelist) and rejected (forbidNonWhitelisted); failures surface as a stable
 * `VALIDATION_FAILED` {@link ApiError} with per-field details.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors: ValidationError[]) =>
      new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Request validation failed.',
        HttpStatus.BAD_REQUEST,
        { fields: flattenValidationErrors(errors) },
      ),
  });
}
