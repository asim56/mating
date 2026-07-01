import { Inject, Injectable } from '@nestjs/common';

import { AUDIT_EMITTER } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../../common';
import {
  BREEDING_REQUESTS_REPOSITORY,
  type InMemoryBreedingRequestsRepository,
} from '../../breeding-requests/breeding-requests.repository';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  type InMemoryVerificationRequestsRepository,
} from '../../verification/verification.repository';

export type DashboardAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(VERIFICATION_REQUESTS_REPOSITORY)
    private readonly verifications: InMemoryVerificationRequestsRepository,
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breeding: InMemoryBreedingRequestsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: DashboardAuditEvent): Promise<void> },
  ) {}

  async summary(user: AuthenticatedUser, query: { regionCode?: string; period?: string }) {
    const period = query.period ?? '30d';
    const verificationStats = await this.verifications.countByStatus();
    const disputeStats = await this.breeding.countDisputes();
    const requestStats = await this.breeding.countByStatus();

    const completed = requestStats.Completed ?? 0;
    const total = Object.values(requestStats).reduce((a, b) => a + b, 0);
    const disputed = disputeStats.total ?? 0;

    await this.audit.emit({
      action: 'admin.dashboard_viewed',
      actorId: user.id,
      subjectType: 'dashboard',
      subjectId: user.id,
      metadata: { period, regionCode: query.regionCode },
    });

    return {
      period,
      regionCode: query.regionCode ?? 'PK',
      metrics: {
        activeBreeders: requestStats.Active ?? 0,
        activeOwners: total,
        searchToRequestConversion: total > 0 ? 0.08 : 0,
        requestCompletionRate: total > 0 ? completed / total : 0,
        disputeRate: total > 0 ? disputed / total : 0,
        verificationThroughput: {
          pending: verificationStats.pending ?? 0,
          approvedThisPeriod: verificationStats.approved ?? 0,
          rejectedThisPeriod: verificationStats.rejected ?? 0,
        },
        revenueSummary: {
          confirmedPaymentsCount: 0,
          totalConfirmedAmount: 0,
          currencyCode: 'PKR',
        },
        monetization: {
          activeBoosts: 0,
          activeSubscriptions: 0,
        },
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
