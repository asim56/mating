import type { AuthenticatedUser } from '../../src/common';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { BreedingRecordsService } from '../../src/modules/breeding-requests/breeding-records.service';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { BreedingRequestsService } from '../../src/modules/breeding-requests/breeding-requests.service';
import { DisputesService } from '../../src/modules/breeding-requests/disputes.service';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { BreedingNotificationProducer } from '../../src/modules/notifications/producers/breeding-notification.producer';
import type { OutboxRepository } from '../../src/modules/notifications/outbox.repository';
import { InMemoryMessagingRepository } from '../../src/modules/messaging/messaging.repository';
import { MessagingService } from '../../src/modules/messaging/messaging.service';
import { PhoneMaskService } from '../../src/modules/messaging/phone-mask.service';

export const REQUESTER: AuthenticatedUser = { id: 'user-requester', roles: ['animal_owner'] };
export const RECIPIENT: AuthenticatedUser = { id: 'user-recipient', roles: ['breeder'] };
export const OUTSIDER: AuthenticatedUser = { id: 'user-outsider', roles: ['animal_owner'] };

class MemoryOutbox implements Pick<OutboxRepository, 'enqueue'> {
  readonly messages: Array<Parameters<OutboxRepository['enqueue']>[0]> = [];

  async enqueue(message: Parameters<OutboxRepository['enqueue']>[0]): Promise<{ inserted: boolean }> {
    if (this.messages.some((m) => m.idempotencyKey === message.idempotencyKey)) {
      return { inserted: false };
    }
    this.messages.push(message);
    return { inserted: true };
  }
}

export async function seedBreedingFixture() {
  const animals = new InMemoryAnimalsRepository();
  const media = new InMemoryAnimalMediaRepository();
  const listings = new InMemoryMarketplaceRepository();
  const breedingRepo = new InMemoryBreedingRequestsRepository();
  const messagingRepo = new InMemoryMessagingRepository();
  const outbox = new MemoryOutbox();
  const audit = { emit: async () => undefined };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const notifications = new BreedingNotificationProducer(outbox as unknown as OutboxRepository);

  const female = await animals.create({
    ownerId: REQUESTER.id,
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
  const femaleReady = (await animals.findById(female.id))!;

  const male = await animals.create({
    ownerId: RECIPIENT.id,
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
  const maleReady = (await animals.findById(male.id))!;

  const listing = await listings.create({
    animalId: male.id,
    ownerId: RECIPIENT.id,
    regionId: 'region-pk',
    regionCode: 'PK',
    listingType: 'stud_service',
    title: 'Champion buck',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    priceAmount: 5000,
    locationRadiusKm: 50,
    species: 'goat',
    breedId: null,
    breedName: null,
    sex: 'male',
    city: 'Lahore',
    provinceOrState: null,
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: male.verificationDimensions,
    ownerDisplayName: null,
  });
  await listings.setStatus(listing.id, 'active');

  const records = new BreedingRecordsService(breedingRepo, audit);
  const breeding = new BreedingRequestsService(
    breedingRepo,
    animals,
    listings,
    audit,
    analytics,
    records,
    notifications,
  );
  const disputes = new DisputesService(breedingRepo, audit, analytics, notifications);
  const phoneMask = new PhoneMaskService();
  const messaging = new MessagingService(
    messagingRepo,
    breedingRepo,
    listings,
    audit,
    phoneMask,
  );

  return {
    animals,
    listings,
    breedingRepo,
    messagingRepo,
    outbox,
    breeding,
    disputes,
    messaging,
    phoneMask,
    female: femaleReady,
    male: maleReady,
    listing,
  };
}
