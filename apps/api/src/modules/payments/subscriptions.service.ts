import { HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';

import { REGIONS, type RegionCode } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import { PaymentsService } from './payments.service';
import {
  PAYMENTS_REPOSITORY,
  InMemoryPaymentsRepository,
} from './payments.repository';
import {
  SUBSCRIPTION_CANCEL_SCHEDULED,
  SUBSCRIPTION_CREATED,
  type PaymentAuditEvent,
} from './events/payment.events';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly repo: InMemoryPaymentsRepository,
    @Inject(forwardRef(() => PaymentsService)) private readonly payments: PaymentsService,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: PaymentAuditEvent): Promise<void> },
  ) {}

  async listPlans(regionCode?: string) {
    const code = (regionCode ?? 'PK') as RegionCode;
    const regionId = code === 'US' ? 'region-us' : 'region-pk';
    let plans = await this.repo.listPlansByRegion(regionId);
    if (plans.length === 0) {
      plans = [
        {
          id: `plan-${code.toLowerCase()}`,
          regionId,
          code: 'breeder_pro_monthly',
          name: 'Breeder Pro Monthly',
          interval: 'month' as const,
          amount: code === 'US' ? 29.99 : 2500,
          currencyCode: REGIONS[code].currency,
          features: { boosts: 1 },
          active: true,
        },
      ];
    }
    return plans;
  }

  async create(
    dto: { planId: string; provider: string; idempotencyKey: string },
    user: AuthenticatedUser,
  ) {
    const existing = await this.repo.findSubscriptionByIdempotency(dto.idempotencyKey);
    if (existing) {
      const intent = existing.paymentIntentId
        ? await this.repo.findIntentById(existing.paymentIntentId)
        : null;
      return { subscription: existing, paymentIntent: intent };
    }

    const plan = await this.repo.findPlanById(dto.planId);
    const plans = await this.listPlans();
    const resolvedPlan = plan ?? plans.find((p) => p.id === dto.planId);
    if (!resolvedPlan) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Plan not found.', HttpStatus.NOT_FOUND);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await this.repo.createSubscription({
      subscriberId: user.id,
      planId: resolvedPlan.id,
      paymentIntentId: null,
      provider: dto.provider as never,
      providerReference: null,
      status: 'past_due',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      metadata: {},
      idempotencyKey: dto.idempotencyKey,
    });

    const intent = await this.payments.createIntent(
      {
        purpose: 'subscription',
        amount: resolvedPlan.amount,
        currencyCode: resolvedPlan.currencyCode,
        provider: dto.provider as never,
        idempotencyKey: `${dto.idempotencyKey}-intent`,
      },
      user,
    );

    await this.repo.updateSubscription(subscription.id, {
      paymentIntentId: intent.id,
      metadata: { subscriptionId: subscription.id },
    });
    await this.repo.updateIntent(intent.id, {
      metadata: { ...intent.metadata, subscriptionId: subscription.id },
    });

    await this.audit.emit({
      action: SUBSCRIPTION_CREATED,
      actorId: user.id,
      subjectType: 'subscription',
      subjectId: subscription.id,
    });

    return { subscription: { ...subscription, paymentIntentId: intent.id }, paymentIntent: intent };
  }

  async getMine(user: AuthenticatedUser) {
    return this.repo.findSubscriptionBySubscriber(user.id);
  }

  async cancelAtPeriodEnd(id: string, user: AuthenticatedUser) {
    const subscription = await this.repo.findSubscriptionById(id);
    if (!subscription || subscription.subscriberId !== user.id) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Subscription not found.', HttpStatus.NOT_FOUND);
    }
    if (subscription.status === 'cancelled') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Already cancelled.', HttpStatus.BAD_REQUEST);
    }
    const updated = await this.repo.updateSubscription(id, { cancelAtPeriodEnd: true });
    await this.audit.emit({
      action: SUBSCRIPTION_CANCEL_SCHEDULED,
      actorId: user.id,
      subjectType: 'subscription',
      subjectId: id,
    });
    return {
      id: updated!.id,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: updated!.currentPeriodEnd,
    };
  }
}
