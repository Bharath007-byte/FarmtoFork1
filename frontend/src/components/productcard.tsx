import { Link } from "react-router-dom";
import type { Listing } from "../types";
import { listingPriceRange } from "../Data/listings";

export function ProductCard({ listing }: { listing: Listing }) {
  const { min, seasonal } = listingPriceRange(listing);
  const packs = listing.variants.length;
  const unit = listing.variants[0]?.weight ?? "";

  return (
    <Link
      to={`/shop/${listing.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-100 bg-white p-2.5 transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f4f6fb]">
        <img
          src={listing.imageUrl}
          alt={listing.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col pt-2.5">
        <p className="text-[11px] font-medium text-zinc-400">
          {listing.category}
          {packs > 1 ? ` · ${packs} packs` : ""}
        </p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-snug text-zinc-900">
          {listing.name}
        </h3>
        <p className="mt-auto pt-3 text-[15px] font-bold text-zinc-900">
          {seasonal
            ? "Seasonal"
            : packs > 1
              ? `from ₹${min}`
              : `₹${min}${unit ? ` / ${unit}` : ""}`}
        </p>
      </div>
    </Link>
  );
}
