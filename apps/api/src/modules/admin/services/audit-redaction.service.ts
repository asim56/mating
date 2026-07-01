import { Injectable } from '@nestjs/common';

const PII_KEYS = new Set([
  'phone',
  'email',
  'proofPath',
  'documentPath',
  'healthRecordPath',
  'accessToken',
  'refreshToken',
]);

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /\+?\d{10,15}/g;

/** Masks PII in audit log metadata for explorer responses (SC-005). */
@Injectable()
export class AuditRedactionService {
  redactMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!metadata) return { redacted: true };
    return this.redactValue(metadata) as Record<string, unknown>;
  }

  private redactValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      return value
        .replace(EMAIL_PATTERN, '[email-redacted]')
        .replace(PHONE_PATTERN, '[phone-redacted]');
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (PII_KEYS.has(key)) {
          out[key] = '[redacted]';
        } else {
          out[key] = this.redactValue(val);
        }
      }
      return out;
    }
    return value;
  }

  isSensitiveAction(action: string): boolean {
    return (
      action.startsWith('admin.document_accessed') ||
      action.startsWith('payment.') ||
      action.includes('proof')
    );
  }
}
