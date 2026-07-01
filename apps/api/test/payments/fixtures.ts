import type { AuthenticatedUser } from '../../src/common';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { BreedingRecordsService } from '../../src/modules/breeding-requests/breeding-records.service';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { BreedingRequestsService } from '../../src/modules/breeding-requests/breeding-requests.service';
import { DisputesService } from '../../src/modules/breeding-requests/disputes.service';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { BreedingNotificationProducer } from '../../src/modules/notifications/producers/breeding-notification.producer';
import type { OutboxRepository } from '../../src/modules/notifications/outbox.repository';
import { PaymentConfirmedHandler } from '../../src/modules/payments/events/payment-confirmed.handler';
import { InMemoryPaymentsRepository } from '../../src/modules/payments/payments.repository';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { LedgerWriterService } from '../../src/modules/wallet-ledger/ledger-writer.service';
import { InMemoryLedgerRepository } from '../../src/modules/wallet-ledger/ledger.repository';
import { AdminPaymentsService } from '../../src/modules/wallet-ledger/admin-payments.service';
import { WalletLedgerService } from '../../src/modules/wallet-ledger/wallet-ledger.service';

export const PAYER: AuthenticatedUser = { id: 'user-payer', roles: ['animal_owner'] };
export const PAYEE: AuthenticatedUser = { id: 'user-payee', roles: ['breeder'] };
export const ADMIN: AuthenticatedUser = { id: 'user-admin', roles: ['super_admin'] };

class MemoryOutbox implements Pick<OutboxRepository, 'enqueue'> {
  async enqueue(): Promise<{ inserted: boolean }> {
    return { inserted: true };
  }
}

const storage = {
  createSignedUploadUrl: async () => ({
    url: 'https://upload.test',
    expiresAt: new Date().toISOString(),
  }),
  createSignedReadUrl: async () => ({
    url: 'https://read.test',
    expiresAt: new Date().toISOString(),
  }),
};

export async function seedPaymentsFixture() {
  const animals = new InMemoryAnimalsRepository();
  const listings = new InMemoryMarketplaceRepository();
  const breedingRepo = new InMemoryBreedingRequestsRepository();
  const paymentsRepo = new InMemoryPaymentsRepository();
  const ledgerRepo = new InMemoryLedgerRepository();
  const audit = { emit: async () => undefined, events: [] as unknown[] };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const notifications = new BreedingNotificationProducer(new MemoryOutbox() as OutboxRepository);
  const ledgerWriter = new LedgerWriterService(ledgerRepo);

  const breeding = new BreedingRequestsService(
    breedingRepo,
    animals,
    listings,
    audit,
    analytics,
    new BreedingRecordsService(breedingRepo, audit),
    notifications,
  );

  const paymentConfirmed = new PaymentConfirmedHandler(breedingRepo, audit, notifications);

  const payments = new PaymentsService(
    paymentsRepo,
    breedingRepo,
    listings,
    audit,
    storage,
    {
      PAYMENT_STUB_SECRET: 'test-secret',
      NODE_ENV: 'test',
      PORT: 4000,
      CORS_ORIGINS: [],
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      API_BASE_URL: 'http://localhost:4000',
      JWT_AUDIENCE: 'authenticated',
      JWT_ISSUER: 'supabase',
      SMS_PROVIDER: 'twilio',
    },
    ledgerWriter,
    paymentConfirmed,
    analytics,
  );

  const wallet = new WalletLedgerService(ledgerRepo, ledgerWriter, audit);
  const adminPayments = new AdminPaymentsService(
    paymentsRepo,
    ledgerRepo,
    payments,
    ledgerWriter,
    audit,
  );

  const female = await animals.create({
    ownerId: PAYER.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'female',
    countryCode: 'PK',
    approximateAgeMonths: 24,
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
  await animals.update(female.id, { ownerDeclaration: true, healthStatus: 'healthy' });

  const male = await animals.create({
    ownerId: PAYEE.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'male',
    countryCode: 'PK',
    approximateAgeMonths: 24,
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
  await animals.update(male.id, { ownerDeclaration: true, healthStatus: 'healthy' });

  const listing = await listings.create({
    animalId: male.id,
    ownerId: PAYEE.id,
    regionId: 'region-pk',
    regionCode: 'PK',
    listingType: 'stud_service',
    title: 'Premium buck',
    breedingMethod: 'natural',
    priceAmount: 5000,
    currencyCode: 'PKR',
    species: 'goat',
    breedId: null,
    breedName: null,
    sex: 'male',
    city: 'Lahore',
    provinceOrState: 'Punjab',
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: male.verificationDimensions,
    ownerDisplayName: 'Breeder',
  });
  await listings.setStatus(listing.id, 'active');

  const request = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    PAYER,
  );

  return {
    animals,
    listings,
    breeding,
    breedingRepo,
    payments,
    paymentsRepo,
    ledgerRepo,
    ledgerWriter,
    wallet,
    adminPayments,
    request,
    listing,
    audit,
  };
}
