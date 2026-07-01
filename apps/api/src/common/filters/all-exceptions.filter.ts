import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { ApiErrorBody } from '@mating/shared';

import { defaultCodeForStatus, ERROR_CODES } from '../errors/error-codes';

type MinimalResponse = {
  status: (code: number) => MinimalResponse;
  json: (body: unknown) => unknown;
};

/**
 * Global filter that normalizes every thrown error into a stable
 * {@link ApiErrorBody} (`{ code, message, details? }`), so clients can branch on
 * `code` instead of brittle message strings.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<MinimalResponse>();
    const { status, body } = this.toErrorBody(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(body.message, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(body);
  }

  private toErrorBody(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return { status, body: this.normalizeHttpPayload(status, payload, exception.message) };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      },
    };
  }

  private normalizeHttpPayload(
    status: number,
    payload: unknown,
    fallbackMessage: string,
  ): ApiErrorBody {
    if (typeof payload === 'string') {
      return { code: defaultCodeForStatus(status), message: payload };
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;

      if (typeof record.code === 'string' && typeof record.message === 'string') {
        return {
          code: record.code,
          message: record.message,
          ...(record.details ? { details: record.details as Record<string, unknown> } : {}),
        };
      }

      const message = Array.isArray(record.message)
        ? (record.message as string[]).join(', ')
        : typeof record.message === 'string'
          ? record.message
          : fallbackMessage;

      return {
        code: defaultCodeForStatus(status),
        message,
        ...(Array.isArray(record.message) ? { details: { errors: record.message } } : {}),
      };
    }

    return { code: defaultCodeForStatus(status), message: fallbackMessage };
  }
}
