import { COMPATIBILITY_WEIGHTS } from '../constants/listing';

export type CompatibilityInput = {
  sameSpecies: boolean;
  sameBreed: boolean;
  healthStatus: string;
  hasPedigree: boolean;
  approvedDimensionCount: number;
  distanceKm: number | null;
  maxDistanceKm: number;
  priorOutcomes?: number;
  disputeRate?: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Normalized breed signal: same breed best, same species partial, else 0. */
export function breedSignal(input: CompatibilityInput): number {
  if (input.sameBreed) return 1;
  if (input.sameSpecies) return 0.5;
  return 0;
}

export function healthSignal(healthStatus: string): number {
  if (healthStatus === 'healthy') return 1;
  if (healthStatus === 'attention') return 0.5;
  if (healthStatus === 'unknown') return 0.25;
  return 0;
}

export function distanceSignal(distanceKm: number | null, maxKm: number): number {
  if (distanceKm === null || maxKm <= 0) return 0.5;
  return clamp01(1 - distanceKm / maxKm);
}

/**
 * Deterministic 0–100 compatibility score from normalized signals.
 * Identical inputs always produce identical scores.
 */
export function computeCompatibilityScore(input: CompatibilityInput): number {
  const signals = {
    breedCompatibility: breedSignal(input),
    healthReadiness: healthSignal(input.healthStatus),
    pedigreeCompleteness: input.hasPedigree ? 1 : 0,
    distance: distanceSignal(input.distanceKm, input.maxDistanceKm),
    verificationLevel: clamp01(input.approvedDimensionCount / 6),
    priorOutcomes: clamp01((input.priorOutcomes ?? 0) / 5),
    lowDisputeRisk: clamp01(1 - (input.disputeRate ?? 0)),
  };

  let total = 0;
  for (const [key, weight] of Object.entries(COMPATIBILITY_WEIGHTS)) {
    const signal = signals[key as keyof typeof signals] ?? 0;
    total += signal * weight;
  }
  return Math.round(total);
}
