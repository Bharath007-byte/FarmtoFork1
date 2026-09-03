import type { Listing } from "../types";
import data from "./listings.json";

export const LISTINGS = data as Listing[];

export function getListing(id: string) {
  return LISTINGS.find((item) => item.id === id);
}

export function listingPriceRange(listing: Listing) {
  const prices = listing.variants.map((v) => v.price).filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0, seasonal: true as const };
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    seasonal: false as const,
  };
}
