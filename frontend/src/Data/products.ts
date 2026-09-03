import type { FarmCategory } from "../types";

export const SEARCH_HINTS = [
  "Search 'tomato'",
  "Search 'palak'",
  "Search 'paneer'",
  "Search 'cardamom'",
  "Search 'buffalo ghee'",
];

export const CATEGORY_TILES: {
  id: FarmCategory;
  name: string;
  image: string;
}[] = [
  {
    id: "Fruits",
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Vegetables",
    name: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "English Vegetables",
    name: "English veg",
    image:
      "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Dairy",
    name: "Dairy",
    image:
      "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Spices",
    name: "Spices",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Ghee",
    name: "Ghee",
    image:
      "https://images.unsplash.com/photo-1635363638580-c2809d049eee?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Eggs & Poultry",
    name: "Eggs",
    image:
      "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "Honey",
    name: "Honey",
    image:
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=400&q=80",
  },
];
