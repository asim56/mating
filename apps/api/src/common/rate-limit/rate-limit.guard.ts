import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';
import {
  RATE_LIMIT_METADATA_KEY,
  type RateLimitCategory,
  type RateLimitRule,
  ruleFor,
} from './rate-limit.config';

type Decision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window counter. In-memory by design for the MVP single-instance API;
 * swap for a shared (Redis) store when the API is horizontally scaled.
 */
export class FixedWindowStore {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  hit(key: string, rule: RateLimitRule): Decision {
    const current = this.now();
    const windowMs = rule.windowSeconds * 1000;
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= current) {
      this.hits.set(key, { count: 1, resetAt: current + windowMs });
      return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
    }

    if (entry.count >= rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - current) / 1000)),
      };
    }

    entry.count += 1;
    return { allowed: true, remaining: rule.limit - entry.count, retryAfterSeconds: 0 };
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: FixedWindowStore = new FixedWindowStore(),
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const category =
      this.reflector.getAllAndOverride<RateLimitCategory>(RATE_LIMIT_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'default';

    const rule = ruleFor(category);
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      user?: { id?: string };
      headers?: Record<string, string | string[] | undefined>;
      res?: { setHeader?: (name: string, value: string | number) => void };
    }>();

    const key = `${category}:${this.clientId(request)}`;
    const decision = this.store.hit(key, rule);

    const setHeader = request.res?.setHeader?.bind(request.res);
    setHeader?.('X-RateLimit-Limit', rule.limit);
    setHeader?.('X-RateLimit-Remaining', Math.max(0, decision.remaining));

    if (!decision.allowed) {
      setHeader?.('Retry-After', decision.retryAfterSeconds);
      throw new ApiError(
        ERROR_CODES.RATE_LIMITED,
        'Too many requests. Please retry later.',
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds: decision.retryAfterSeconds },
      );
    }

    return true;
  }

  private clientId(request: {
    ip?: string;
    user?: { id?: string };
    headers?: Record<string, string | string[] | undefined>;
  }): string {
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    const forwarded = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
    return `ip:${forwardedIp ?? request.ip ?? 'unknown'}`;
  }
}
