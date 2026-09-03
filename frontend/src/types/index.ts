export type UserRole = "farmer" | "consumer" | "logistics" | "admin";

export type FarmCategory =
  | "Fruits"
  | "Vegetables"
  | "English Vegetables"
  | "Dairy"
  | "Spices"
  | "Ghee"
  | "Eggs & Poultry"
  | "Honey";

export interface ProductVariant {
  id: string;
  variety: string;
  weight: string;
  price: number;
  originalPrice: number;
  farmer: string;
  location: string;
  inStock: boolean;
}

export interface Listing {
  id: string;
  name: string;
  category: FarmCategory;
  subCategory: string;
  imageUrl: string;
  description: string;
  rating: number;
  reviews: number;
  badge?: string;
  organic: boolean;
  variants: ProductVariant[];
}

export interface BuyOffer {
  id: string;
  name: string;
  category: FarmCategory;
  unit: string;
  retailFrom: number;
  weBuyAt: number;
  imageUrl: string;
}

export interface StoredAccount {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  phone?: string;
  crops?: string[];
}

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  crops?: string[];
  photoUrl?: string;
}

export interface CartLine {
  listingId: string;
  variantId: string;
  qty: number;
}

export interface FarmerOffer {
  id: string;
  title: string;
  category: FarmCategory;
  quantity: string;
  harvestDate: string;
  askingPrice: number;
  estimate: { low: number; mid: number; high: number };
  grade?: string;
  photo: string;
  notes: string;
  farmerName: string;
  farmLocation: string;
  phone: string;
  createdAt: string;
}
