import { Injectable } from '@nestjs/common';

import { PHONE_REVEAL_STATUSES, type BreedingRequestStatus } from '@mating/shared';

const PHONE_HIDDEN = '[phone hidden]';

/** E.164 and common PK/US local patterns. */
const PHONE_PATTERNS = [
  /\+?[1-9]\d{7,14}\b/g,
  /\b0?3\d{2}[-\s]?\d{7}\b/g,
  /\(\d{3}\)\s+\d{3}[-\s]\d{4}/g,
  /\b\d{3}[-\s]\d{3}[-\s]\d{4}\b/g,
];

@Injectable()
export class PhoneMaskService {
  maskBody(body: string | null | undefined): string | null {
    if (!body) return body ?? null;
    let masked = body;
    for (const pattern of PHONE_PATTERNS) {
      masked = masked.replace(pattern, PHONE_HIDDEN);
    }
    return masked;
  }

  shouldReveal(requestStatus: BreedingRequestStatus | null): boolean {
    if (!requestStatus) return false;
    return (PHONE_REVEAL_STATUSES as readonly string[]).includes(requestStatus);
  }

  prepareBody(
    body: string | null | undefined,
    requestStatus: BreedingRequestStatus | null,
  ): { body: string | null; phoneRevealed: boolean } {
    if (!body) return { body: body ?? null, phoneRevealed: false };
    if (this.shouldReveal(requestStatus)) {
      return { body, phoneRevealed: true };
    }
    return { body: this.maskBody(body), phoneRevealed: false };
  }

  containsPhone(body: string): boolean {
    return PHONE_PATTERNS.some((p) => {
      const re = new RegExp(p.source, p.flags);
      return re.test(body);
    });
  }
}
