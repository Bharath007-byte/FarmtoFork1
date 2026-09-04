import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  ChevronDown,
  ShoppingCart,
  UserRound,
  Plus,
  Minus,
  X,
  Star,
  ShieldCheck,
  Clock3,
  Leaf,
  Heart,
  SlidersHorizontal,
  ArrowRight,
  PackageCheck,
  Sprout,
  Apple,
  Carrot,
  Milk,
  Wheat,
  Flame,
  Droplets,
  Nut,
  Hexagon,
  RefreshCw,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop&q=85";

type ApiProduct = {
  id: string;
  name: string;
  variety?: string | null;
  description?: string | null;
  unit: string;
  pricePaise: number;
  organic: boolean;
  harvestDate?: string | null;
  imageUrl?: string | null;
  active: boolean;
  farmer?: {
    farmName?: string;
    district?: string;
    state?: string;
    verified?: boolean;
    user?: {
      name?: string;
    };
  };
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  inventory?: {
    available?: number;
    reserved?: number;
  };
  rating?: number;
  reviews?: number;
};

type Product = {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  unit: string;
  price: number;
  imageUrl: string;
  description: string;
  farmerName: string;
  farmName: string;
  district: string;
  state: string;
  verified: boolean;
  organic: boolean;
  harvestDate: string | null;
  available: number;
  rating: number | null;
  reviews: number | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
};

const CATEGORY_META: Record<
  string,
  {
    icon: React.ReactNode;
    short: string;
  }
> = {
  fruits: {
    icon: <Apple className="h-5 w-5" />,
    short: "Fresh & Seasonal",
  },
  vegetables: {
    icon: <Carrot className="h-5 w-5" />,
    short: "Farm Fresh",
  },
  "dairy-cheese": {
    icon: <Milk className="h-5 w-5" />,
    short: "Pure & Natural",
  },
  dairy: {
    icon: <Milk className="h-5 w-5" />,
    short: "Pure & Natural",
  },
  "grains-pulses": {
    icon: <Wheat className="h-5 w-5" />,
    short: "Wholesome",
  },
  "rice-dal": {
    icon: <Wheat className="h-5 w-5" />,
    short: "Wholesome",
  },
  spices: {
    icon: <Flame className="h-5 w-5" />,
    short: "Pure & Aromatic",
  },
  "oils-ghee": {
    icon: <Droplets className="h-5 w-5" />,
    short: "Cold Pressed",
  },
  oil: {
    icon: <Droplets className="h-5 w-5" />,
    short: "Cold Pressed",
  },
  "dry-fruits": {
    icon: <Nut className="h-5 w-5" />,
    short: "Nutrient Rich",
  },
  "honey-natural": {
    icon: <Hexagon className="h-5 w-5" />,
    short: "Pure Goodness",
  },
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "fruits",
    name: "Fruits",
    slug: "fruits",
    icon: <Apple className="h-5 w-5" />,
  },
  {
    id: "vegetables",
    name: "Vegetables",
    slug: "vegetables",
    icon: <Carrot className="h-5 w-5" />,
  },
  {
    id: "dairy-cheese",
    name: "Dairy & Cheese",
    slug: "dairy-cheese",
    icon: <Milk className="h-5 w-5" />,
  },
  {
    id: "grains-pulses",
    name: "Grains & Pulses",
    slug: "grains-pulses",
    icon: <Wheat className="h-5 w-5" />,
  },
  {
    id: "spices",
    name: "Spices",
    slug: "spices",
    icon: <Flame className="h-5 w-5" />,
  },
  {
    id: "oils-ghee",
    name: "Oils & Ghee",
    slug: "oils-ghee",
    icon: <Droplets className="h-5 w-5" />,
  },
  {
    id: "dry-fruits",
    name: "Dry Fruits",
    slug: "dry-fruits",
    icon: <Nut className="h-5 w-5" />,
  },
  {
    id: "honey-natural",
    name: "Honey & Natural",
    slug: "honey-natural",
    icon: <Hexagon className="h-5 w-5" />,
  },
];

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function normalizeCategorySlug(slug?: string, name?: string) {
  const source = String(slug || name || "")
    .toLowerCase()
    .trim();

  if (source.includes("dairy")) return "dairy-cheese";
  if (source.includes("grain") || source.includes("pulse")) {
    return "grains-pulses";
  }
  if (source.includes("rice") || source.includes("dal")) {
    return "grains-pulses";
  }
  if (source.includes("oil") || source.includes("ghee")) {
    return "oils-ghee";
  }
  if (source.includes("dry") || source.includes("nut")) {
    return "dry-fruits";
  }
  if (source.includes("honey") || source.includes("natural")) {
    return "honey-natural";
  }

  return source;
}

function mapProduct(item: ApiProduct): Product {
  const categoryName =
    item.category?.name ||
    item.category?.slug ||
    "Farm Fresh";

  const categorySlug = normalizeCategorySlug(
    item.category?.slug,
    item.category?.name,
  );

  return {
    id: item.id,
    name: item.name,
    category: categoryName,
    categorySlug,
    unit: item.unit,
    price: Number(item.pricePaise || 0) / 100,
    imageUrl: item.imageUrl || FALLBACK_IMAGE,
    description:
      item.description ||
      "Freshly sourced through the Farm2Fork farmer marketplace.",
    farmerName:
      item.farmer?.user?.name ||
      "Farm Partner",
    farmName:
      item.farmer?.farmName ||
      "Verified Farm Partner",
    district:
      item.farmer?.district ||
      "",
    state:
      item.farmer?.state ||
      "",
    verified: Boolean(item.farmer?.verified),
    organic: Boolean(item.organic),
    harvestDate: item.harvestDate || null,
    available: Number(item.inventory?.available || 0),
    rating:
      typeof item.rating === "number"
        ? item.rating
        : null,
    reviews:
      typeof item.reviews === "number"
        ? item.reviews
        : null,
  };
}

function formatHarvestDate(date: string | null) {
  if (!date) return null;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<
    "recommended" | "price-low" | "price-high" | "fresh"
  >("recommended");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeProduct, setActiveProduct] =
    useState<Product | null>(null);

  const [cart, setCart] =
    useState<Record<string, number>>({});

  const [liked, setLiked] =
    useState<Record<string, boolean>>({});

  const [showFilters, setShowFilters] =
    useState(false);

  const [visibleCount, setVisibleCount] =
    useState(24);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/products`,
      );

      if (!response.ok) {
        throw new Error(
          `Products request failed with ${response.status}`,
        );
      }

      const data = await response.json();

      const nextProducts = Array.isArray(data?.products)
        ? data.products.map(mapProduct)
        : [];

      setProducts(nextProducts);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load marketplace products from the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch(
        `${API_BASE}/api/products/categories`,
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data?.categories)) {
        return;
      }

      const nextCategories: Category[] =
        data.categories
          .map(
            (category: {
              id?: string;
              name?: string;
              slug?: string;
            }) => {
              const slug = normalizeCategorySlug(
                category.slug,
                category.name,
              );

              const meta =
                CATEGORY_META[slug];

              return {
                id:
                  category.id ||
                  slug,
                name:
                  category.name ||
                  slug,
                slug,
                icon:
                  meta?.icon ||
                  <Sprout className="h-5 w-5" />,
              };
            },
          )
          .filter(
            (category: Category, index: number, list: Category[]) =>
              list.findIndex(
                (item) =>
                  item.slug === category.slug,
              ) === index,
          );

      if (nextCategories.length > 0) {
        setCategories(nextCategories);
      }
    } catch (err) {
      console.warn(
        "Category request failed; using marketplace defaults.",
        err,
      );
    }
  }

  async function refreshMarketplace() {
    setRefreshing(true);

    try {
      await loadProducts();
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    const filtered = products.filter((product) => {
      const categoryMatch =
        selectedCategory === "all" ||
        product.categorySlug === selectedCategory;

      const searchMatch =
        !query ||
        [
          product.name,
          product.category,
          product.farmerName,
          product.farmName,
          product.district,
          product.state,
          product.unit,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return categoryMatch && searchMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") {
        return a.price - b.price;
      }

      if (sort === "price-high") {
        return b.price - a.price;
      }

      if (sort === "fresh") {
        const aDate = a.harvestDate
          ? new Date(a.harvestDate).getTime()
          : 0;

        const bDate = b.harvestDate
          ? new Date(b.harvestDate).getTime()
          : 0;

        return bDate - aDate;
      }

      if (a.verified !== b.verified) {
        return Number(b.verified) - Number(a.verified);
      }

      if (a.organic !== b.organic) {
        return Number(b.organic) - Number(a.organic);
      }

      return a.name.localeCompare(
        b.name,
        "en",
      );
    });
  }, [
    products,
    selectedCategory,
    search,
    sort,
  ]);

  const visibleProducts =
    filteredProducts.slice(
      0,
      visibleCount,
    );

  const cartCount =
    Object.values(cart).reduce(
      (sum, quantity) =>
        sum + quantity,
      0,
    );

  const cartTotal =
    Object.entries(cart).reduce(
      (sum, [productId, quantity]) => {
        const product = products.find(
          (item) => item.id === productId,
        );

        return (
          sum +
          (product?.price || 0) *
            quantity
        );
      },
      0,
    );

  function selectCategory(
    category: string,
  ) {
    setSelectedCategory(category);
    setVisibleCount(24);
    setShowFilters(false);

    setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function addToCart(
    productId: string,
  ) {
    setCart((current) => ({
      ...current,
      [productId]:
        (current[productId] || 0) + 1,
    }));
  }

  function removeFromCart(
    productId: string,
  ) {
    setCart((current) => {
      const next = {
        ...current,
      };

      if (!next[productId]) {
        return next;
      }

      if (next[productId] === 1) {
        delete next[productId];
      } else {
        next[productId] -= 1;
      }

      return next;
    });
  }

  function toggleLike(
    productId: string,
  ) {
    setLiked((current) => ({
      ...current,
      [productId]:
        !current[productId],
    }));
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#17211b]">
      {/* ------------------------------------------------ */}
      {/* TOP HEADER                                      */}
      {/* ------------------------------------------------ */}

      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="group shrink-0 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ee] text-[#1d7a42]">
                <Leaf className="h-6 w-6" />
              </div>

              <div>
                <div className="text-[22px] font-black tracking-tight sm:text-[25px]">
                  <span className="text-[#075b42]">
                    Farm
                  </span>
                  <span className="text-[#ef6a35]">
                    2
                  </span>
                  <span className="text-[#075b42]">
                    Fork
                  </span>
                </div>

                <div className="hidden text-[9px] font-semibold text-slate-400 sm:block">
                  Fresh from Farmers, Direct to You
                </div>
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            <button className="text-sm font-medium text-slate-700 hover:text-[#075b42]">
              Home
            </button>

            <button className="border-b-2 border-[#16823f] pb-1 text-sm font-bold text-[#075b42]">
              Marketplace
            </button>

            <button className="text-sm font-medium text-slate-700 hover:text-[#075b42]">
              Farmers
            </button>

            <button className="text-sm font-medium text-slate-700 hover:text-[#075b42]">
              About
            </button>

            <button className="text-sm font-medium text-slate-700 hover:text-[#075b42]">
              Track Order
            </button>
          </nav>

          <div className="relative ml-auto min-w-0 flex-1 lg:max-w-[480px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
                setVisibleCount(24);
              }}
              placeholder="Search for fresh fruits, vegetables, dairy..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-[#f7f8f7] pl-12 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2b8b4a] focus:bg-white focus:ring-4 focus:ring-[#2b8b4a]/10"
            />

            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setVisibleCount(24);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button className="hidden items-center gap-2 xl:flex">
            <MapPin className="h-5 w-5 text-[#16823f]" />

            <span className="text-left">
              <span className="block text-[10px] font-bold text-slate-400">
                DELIVERY TO
              </span>

              <span className="block text-xs font-bold">
                Select location
              </span>
            </span>

            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <button className="hidden items-center gap-2 rounded-xl px-2 py-2 md:flex">
            <UserRound className="h-5 w-5" />

            <span className="text-xs font-bold">
              Account
            </span>
          </button>

          <button
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
            className="relative rounded-xl p-2.5 transition hover:bg-[#eef8f1]"
          >
            <ShoppingCart className="h-6 w-6 text-[#075b42]" />

            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef6a35] px-1 text-[10px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------ */}
      {/* MAIN LAYOUT                                     */}
      {/* ------------------------------------------------ */}

      <main className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        {/* HERO */}

        <section className="relative overflow-hidden py-7 sm:py-9">
          <div className="relative overflow-hidden rounded-[28px] bg-[#eaf6df] px-6 py-10 sm:px-10 lg:px-14">
            <div className="relative z-10 max-w-[650px]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#24743c]">
                <Sprout className="h-3.5 w-3.5" />
                FARM DIRECT MARKETPLACE
              </div>

              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-[#17482c] sm:text-5xl lg:text-6xl">
                Fresh from Farms,
                <br />
                Direct to You
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#58705d] sm:text-base">
                Discover fresh produce and
                farm products directly from
                verified Indian farmers.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    selectCategory("all")
                  }
                  className="rounded-xl bg-[#16823f] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[#16823f]/20 transition hover:-translate-y-0.5 hover:bg-[#126e36]"
                >
                  Shop Fresh Products
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </button>

                <button
                  onClick={() =>
                    selectCategory("fruits")
                  }
                  className="rounded-xl border border-[#9bc5a3] bg-white/80 px-5 py-3 text-xs font-black text-[#176b35] transition hover:bg-white"
                >
                  Explore Fruits
                </button>
              </div>
            </div>

            <div className="absolute -right-20 -top-20 hidden h-[400px] w-[600px] rounded-full bg-[#d5edc5] lg:block" />

            <div className="absolute -right-5 bottom-0 hidden w-[440px] lg:block">
              <div className="grid grid-cols-3 gap-3 opacity-95">
                {[
                  "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&auto=format&fit=crop&q=85",
                  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=85",
                  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=85",
                ].map((src) => (
                  <div
                    key={src}
                    className="aspect-square overflow-hidden rounded-3xl bg-white shadow-lg"
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ */}
        {/* CATEGORY BAR                                     */}
        {/* ------------------------------------------------ */}

        <section className="pb-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#16823f]">
                Explore
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Shop by Category
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Farm-fresh categories, all in one place.
              </p>
            </div>

            <button
              onClick={() =>
                selectCategory("all")
              }
              className="hidden items-center gap-1 text-xs font-black text-[#16823f] sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            <CategoryTile
              active={selectedCategory === "all"}
              icon={
                <Leaf className="h-6 w-6" />
              }
              title="All Products"
              subtitle={`${products.length} products`}
              onClick={() =>
                selectCategory("all")
              }
            />

            {categories.map((category) => {
              const count =
                products.filter(
                  (product) =>
                    product.categorySlug ===
                    category.slug,
                ).length;

              const meta =
                CATEGORY_META[
                  category.slug
                ];

              return (
                <CategoryTile
                  key={category.slug}
                  active={
                    selectedCategory ===
                    category.slug
                  }
                  icon={
                    meta?.icon ||
                    category.icon
                  }
                  title={category.name}
                  subtitle={
                    count > 0
                      ? `${count} products`
                      : meta?.short ||
                        "Farm Fresh"
                  }
                  onClick={() =>
                    selectCategory(
                      category.slug,
                    )
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------ */}
        {/* TRUST STRIP                                     */}
        {/* ------------------------------------------------ */}

        <section className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-[#e4eee5] bg-white p-4 md:grid-cols-4">
          <TrustItem
            icon={
              <Leaf className="h-5 w-5" />
            }
            title="Direct from Farmers"
            text="Farmer-first marketplace"
          />

          <TrustItem
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
            title="Verified Farms"
            text="Verification shown when available"
          />

          <TrustItem
            icon={
              <PackageCheck className="h-5 w-5" />
            }
            title="Fresh Stock"
            text="Inventory from the database"
          />

          <TrustItem
            icon={
              <Clock3 className="h-5 w-5" />
            }
            title="Transparent Pricing"
            text="Current product price"
          />
        </section>

        {/* ------------------------------------------------ */}
        {/* PRODUCTS                                        */}
        {/* ------------------------------------------------ */}

        <section
          id="products"
          className="scroll-mt-24 pb-14"
        >
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight">
                  {search
                    ? `Results for "${search}"`
                    : selectedCategory ===
                        "all"
                      ? "Fresh Products"
                      : categories.find(
                          (category) =>
                            category.slug ===
                            selectedCategory,
                        )?.name ||
                        "Fresh Products"}
                </h2>

                <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-[10px] font-black text-[#16733a]">
                  {filteredProducts.length} products
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Real marketplace inventory from
                Farm2Fork.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setShowFilters(
                    (value) => !value,
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={refreshMarketplace}
                disabled={refreshing}
                className="rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-[#16823f] hover:text-[#16823f] disabled:opacity-50"
                title="Refresh products"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </button>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value as typeof sort,
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#16823f]"
              >
                <option value="recommended">
                  Sort: Recommended
                </option>
                <option value="fresh">
                  Sort: Freshest
                </option>
                <option value="price-low">
                  Price: Low to High
                </option>
                <option value="price-high">
                  Price: High to Low
                </option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 lg:hidden">
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={
                    selectedCategory === "all"
                  }
                  label="All Products"
                  onClick={() =>
                    selectCategory("all")
                  }
                />

                {categories.map(
                  (category) => (
                    <FilterButton
                      key={category.slug}
                      active={
                        selectedCategory ===
                        category.slug
                      }
                      label={category.name}
                      onClick={() =>
                        selectCategory(
                          category.slug,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </div>
          )}

          {loading ? (
            <ProductSkeletonGrid />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={loadProducts}
            />
          ) : filteredProducts.length ===
            0 ? (
            <EmptyState
              search={search}
              onClear={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {visibleProducts.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={
                        cart[product.id] || 0
                      }
                      liked={
                        !!liked[product.id]
                      }
                      onOpen={() =>
                        setActiveProduct(
                          product,
                        )
                      }
                      onAdd={() =>
                        addToCart(
                          product.id,
                        )
                      }
                      onRemove={() =>
                        removeFromCart(
                          product.id,
                        )
                      }
                      onLike={() =>
                        toggleLike(
                          product.id,
                        )
                      }
                    />
                  ),
                )}
              </div>

              {visibleProducts.length <
                filteredProducts.length && (
                <div className="flex justify-center pt-9">
                  <button
                    onClick={() =>
                      setVisibleCount(
                        (value) =>
                          value + 24,
                      )
                    }
                    className="rounded-xl bg-[#16823f] px-7 py-3 text-xs font-black text-white shadow-lg shadow-[#16823f]/20 transition hover:-translate-y-0.5 hover:bg-[#126e36]"
                  >
                    Load More
                    <span className="ml-2 text-white/70">
                      {filteredProducts.length -
                        visibleProducts.length}{" "}
                      remaining
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ------------------------------------------------ */}
      {/* PRODUCT MODAL                                    */}
      {/* ------------------------------------------------ */}

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          quantity={
            cart[activeProduct.id] || 0
          }
          liked={
            !!liked[activeProduct.id]
          }
          onClose={() =>
            setActiveProduct(null)
          }
          onAdd={() =>
            addToCart(
              activeProduct.id,
            )
          }
          onRemove={() =>
            removeFromCart(
              activeProduct.id,
            )
          }
          onLike={() =>
            toggleLike(
              activeProduct.id,
            )
          }
        />
      )}

      {/* ------------------------------------------------ */}
      {/* FLOATING CART                                    */}
      {/* ------------------------------------------------ */}

      {cartCount > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 items-center justify-between rounded-2xl bg-[#075b42] p-3 text-white shadow-2xl shadow-[#075b42]/25">
          <div className="flex items-center gap-3">
            <div className="relative rounded-xl bg-white/10 p-2.5">
              <ShoppingCart className="h-5 w-5" />

              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef6a35] px-1 text-[10px] font-black">
                {cartCount}
              </span>
            </div>

            <div>
              <p className="text-[10px] text-white/60">
                {cartCount} item
                {cartCount !== 1
                  ? "s"
                  : ""}{" "}
                selected
              </p>

              <p className="text-base font-black">
                {money(cartTotal)}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-[#075b42] transition hover:bg-[#f0f7f2]"
          >
            View Cart
            <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* FOOTER                                           */}
      {/* ------------------------------------------------ */}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ee] text-[#16823f]">
                  <Leaf className="h-6 w-6" />
                </div>

                <div className="text-2xl font-black">
                  <span className="text-[#075b42]">
                    Farm
                  </span>
                  <span className="text-[#ef6a35]">
                    2
                  </span>
                  <span className="text-[#075b42]">
                    Fork
                  </span>
                </div>
              </div>

              <p className="mt-3 max-w-sm text-xs leading-5 text-slate-500">
                A direct farmer-to-consumer
                marketplace designed to improve
                price transparency, farmer access
                and fresh food delivery.
              </p>
            </div>

            <FooterColumn
              title="Marketplace"
              items={[
                "Fruits",
                "Vegetables",
                "Dairy & Cheese",
                "Grains & Pulses",
              ]}
            />

            <FooterColumn
              title="Farm2Fork"
              items={[
                "Farmers",
                "About",
                "Track Order",
                "Farmer Verification",
              ]}
            />

            <FooterColumn
              title="Trust"
              items={[
                "Direct from Farmers",
                "Transparent Pricing",
                "Product Traceability",
                "Quality Information",
              ]}
            />
          </div>

          <div className="mt-8 border-t border-slate-100 pt-5 text-[11px] text-slate-400">
            © 2026 Farm2Fork. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ====================================================== */
/* CATEGORY TILE                                          */
/* ====================================================== */

function CategoryTile({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group min-w-[145px] rounded-2xl border p-4 text-left transition duration-200 sm:min-w-[170px] ${
        active
          ? "border-[#16823f] bg-[#16823f] text-white shadow-lg shadow-[#16823f]/15"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#b8d8c0] hover:shadow-md"
      }`}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
          active
            ? "bg-white/15 text-white"
            : "bg-[#eef8f1] text-[#16823f]"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs font-black leading-4">
        {title}
      </p>

      <p
        className={`mt-1 text-[10px] ${
          active
            ? "text-white/70"
            : "text-slate-400"
        }`}
      >
        {subtitle}
      </p>
    </button>
  );
}

/* ====================================================== */
/* PRODUCT CARD                                           */
/* ====================================================== */

function ProductCard({
  product,
  quantity,
  liked,
  onOpen,
  onAdd,
  onRemove,
  onLike,
}: {
  product: Product;
  quantity: number;
  liked: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onLike: () => void;
}) {
  return (
    <article
      className="group flex min-h-[390px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#b9d8c0] hover:shadow-xl"
      onClick={onOpen}
    >
      {/* IMAGE */}

      <div className="relative aspect-square overflow-hidden bg-[#f3e8d7]">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src =
              FALLBACK_IMAGE;
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />

        {/* Organic */}

        {product.organic && (
          <span className="absolute left-3 top-3 rounded-lg bg-[#16823f] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-sm">
            Organic
          </span>
        )}

        {/* Verified */}

        {product.verified && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[9px] font-black text-[#16823f] shadow-sm">
            <ShieldCheck className="h-3 w-3" />
            Verified Farmer
          </span>
        )}

        {/* Heart */}

        <button
          onClick={(event) => {
            event.stopPropagation();
            onLike();
          }}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${
            liked
              ? "text-rose-500"
              : "text-slate-600"
          }`}
          aria-label={
            liked
              ? "Remove from favourites"
              : "Add to favourites"
          }
        >
          <Heart
            className={`h-4.5 w-4.5 ${
              liked
                ? "fill-current"
                : ""
            }`}
          />
        </button>
      </div>

      {/* CONTENT */}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-[#16823f]">
            {product.category}
          </span>

          {product.available > 0 && (
            <span className="shrink-0 text-[9px] font-bold text-slate-400">
              In stock
            </span>
          )}
        </div>

        <h3 className="mt-2 min-h-[40px] text-sm font-black leading-5 text-slate-900">
          {product.name}
        </h3>

        {/* Farmer */}

        <div className="mt-2 min-h-[32px]">
          <p className="truncate text-[10px] font-bold text-slate-500">
            {product.farmerName}
          </p>

          {product.district && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {product.district}
              {product.state
                ? `, ${product.state}`
                : ""}
            </p>
          )}
        </div>

        {/* Rating only when real data exists */}

        <div className="mt-2 min-h-[17px]">
          {product.rating !== null ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />

              <span className="text-[10px] font-black">
                {product.rating.toFixed(
                  1,
                )}
              </span>

              {product.reviews !==
                null && (
                <span className="text-[9px] text-slate-400">
                  ({product.reviews})
                </span>
              )}
            </div>
          ) : (
            <span className="text-[9px] text-slate-400">
              No ratings yet
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-black text-slate-900">
                {money(product.price)}
              </p>

              <p className="text-[10px] font-semibold text-slate-400">
                per {product.unit}
              </p>
            </div>

            {quantity === 0 ? (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onAdd();
                }}
                className="rounded-xl border-2 border-[#16823f] bg-white px-5 py-2.5 text-xs font-black text-[#16823f] transition hover:bg-[#16823f] hover:text-white"
              >
                ADD
              </button>
            ) : (
              <div
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="flex items-center overflow-hidden rounded-xl bg-[#16823f] text-white"
              >
                <button
                  onClick={onRemove}
                  className="p-2 transition hover:bg-white/10"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="min-w-8 text-center text-xs font-black">
                  {quantity}
                </span>

                <button
                  onClick={onAdd}
                  className="p-2 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ====================================================== */
/* PRODUCT MODAL                                          */
/* ====================================================== */

function ProductModal({
  product,
  quantity,
  liked,
  onClose,
  onAdd,
  onRemove,
  onLike,
}: {
  product: Product;
  quantity: number;
  liked: boolean;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onLike: () => void;
}) {
  const harvestDate =
    formatHarvestDate(
      product.harvestDate,
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-[9px] font-black uppercase tracking-wide text-[#16823f]">
              {product.category}
            </span>

            {product.verified && (
              <span className="flex items-center gap-1 text-[9px] font-black text-[#16823f]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Farmer
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-8 p-5 md:grid-cols-2 md:p-8">
          <div>
            <div className="relative overflow-hidden rounded-[24px] bg-[#f3e8d7]">
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src =
                    FALLBACK_IMAGE;
                }}
                className="aspect-square w-full object-cover"
              />

              {product.organic && (
                <span className="absolute left-4 top-4 rounded-lg bg-[#16823f] px-3 py-1.5 text-[10px] font-black text-white">
                  ORGANIC
                </span>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-[#eef8f1] p-5">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-[#16823f]" />

                <div>
                  <p className="text-sm font-black text-[#075b42]">
                    Farm2Fork Trust
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Farmer identity,
                    verification,
                    inventory and
                    product information
                    are shown from
                    available platform
                    records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#16823f]">
              {product.farmName}
            </p>

            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-slate-900">
              {product.name}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.rating !==
                null && (
                <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {product.rating.toFixed(
                    1,
                  )}
                </span>
              )}

              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                {product.unit}
              </span>

              {product.organic && (
                <span className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-black text-green-700">
                  Organic
                </span>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-[#fafbf9] p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Current marketplace price
              </p>

              <p className="mt-1 text-4xl font-black text-slate-900">
                {money(product.price)}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                per {product.unit}
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                About this product
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {product.description}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoBox
                title="Farmer"
                value={
                  product.farmerName
                }
              />

              <InfoBox
                title="Farm"
                value={
                  product.farmName
                }
              />

              <InfoBox
                title="Location"
                value={
                  [
                    product.district,
                    product.state,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "Not provided"
                }
              />

              <InfoBox
                title="Available"
                value={`${product.available} ${product.unit}`}
              />

              {harvestDate && (
                <InfoBox
                  title="Harvest date"
                  value={
                    harvestDate
                  }
                />
              )}
            </div>

            <div className="mt-auto flex gap-3 pt-7">
              {quantity === 0 ? (
                <button
                  onClick={onAdd}
                  className="flex-1 rounded-xl bg-[#16823f] py-3.5 text-xs font-black text-white shadow-lg shadow-[#16823f]/20 transition hover:bg-[#126e36]"
                >
                  ADD TO CART
                  <span className="ml-2 text-white/70">
                    • {money(product.price)}
                  </span>
                </button>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl bg-[#16823f] text-white">
                  <button
                    onClick={onRemove}
                    className="rounded-lg p-3 hover:bg-white/10"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <span className="px-7 text-sm font-black">
                    {quantity}
                  </span>

                  <button
                    onClick={onAdd}
                    className="rounded-lg p-3 hover:bg-white/10"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              )}

              <button
                onClick={onLike}
                className={`rounded-xl border px-4 ${
                  liked
                    ? "border-rose-200 bg-rose-50 text-rose-500"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                <Heart
                  className={`h-5 w-5 ${
                    liked
                      ? "fill-current"
                      : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================== */
/* SUPPORT COMPONENTS                                     */
/* ====================================================== */

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf7ef] text-[#16823f]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11px] font-black">
          {title}
        </p>

        <p className="truncate text-[9px] text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-1 line-clamp-2 text-[11px] font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[10px] font-black transition ${
        active
          ? "bg-[#16823f] text-white"
          : "bg-slate-100 text-slate-600 hover:bg-[#eaf7ef] hover:text-[#16823f]"
      }`}
    >
      {label}
    </button>
  );
}

function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({
        length: 12,
      }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-100 bg-white"
        >
          <div className="aspect-square animate-pulse bg-[#f0f0ed]" />

          <div className="space-y-3 p-4">
            <div className="h-2 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-5 h-9 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef8f1] text-[#16823f]">
        <Search className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-xl font-black">
        No products found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {search
          ? `We couldn't find products matching "${search}".`
          : "There are currently no products in this category."}
      </p>

      <button
        onClick={onClear}
        className="mt-6 rounded-xl bg-[#16823f] px-5 py-3 text-xs font-black text-white"
      >
        Show All Products
      </button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <RefreshCw className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-lg font-black">
        Marketplace unavailable
      </h3>

      <p className="mx-auto mt-2 max-w-lg px-4 text-sm text-slate-500">
        {message}
      </p>

      <button
        onClick={onRetry}
        className="mt-5 rounded-xl bg-[#16823f] px-5 py-3 text-xs font-black text-white"
      >
        Try Again
      </button>
    </div>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="text-sm font-black">
        {title}
      </h3>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <p
            key={item}
            className="text-xs text-slate-500"
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export default Marketplace;
