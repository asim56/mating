/**
 * Cross-cutting platform primitives consumed by every feature module:
 * stable error contract, validation, pagination, rate limiting, and auth/RBAC.
 */

export * from './errors/error-codes';
export * from './errors/api-error';
export * from './filters/all-exceptions.filter';
export * from './pipes/validation.pipe';

export * from './pagination/cursor';
export * from './pagination/paginated-response.dto';

export * from './rate-limit/rate-limit.config';
export * from './rate-limit/rate-limit.guard';

export * from './auth/roles.decorator';
export * from './auth/jwt.guard';
export * from './auth/jwks-token-verifier';
export * from './auth/roles.guard';
export * from './auth/account-status.guard';
export * from './auth/session.guard';
export * from './auth/ownership-policy.base';
