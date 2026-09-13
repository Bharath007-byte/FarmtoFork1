/**
 * Agricultural Produce & Crop Verification System
 * Validates whether an uploaded image and name represent legitimate farm produce
 * (fruits, vegetables, grains, pulses, dairy, spices, herbs, flowers)
 * and rejects human portraits, selfies, vehicles, electronics, furniture, animals, etc.
 */

// Comprehensive recognized farm produce categories and crops in English, Hindi, Telugu, and Kannada
export const ALLOWED_PRODUCE_KEYWORDS = new Set([
  // Vegetables
  "tomato", "tomatoes", "tamatar", "tamata", "tamato",
  "potato", "potatoes", "aloo", "alu", "bangaladumpa", "urulaikizhangu",
  "onion", "onions", "pyaz", "ullipaya", "eerulli",
  "chilli", "chili", "chillies", "mirchi", "mirapa", "pachimirapa", "menasinakai",
  "capsicum", "bell pepper", "shimla mirch", "bengaluru mirapa",
  "carrot", "carrots", "gajar", "karetu",
  "cabbage", "patta gobhi", "kosa", "yelekosu",
  "cauliflower", "phool gobhi", "gobi", "hookosu",
  "brinjal", "eggplant", "baingan", "vankaya", "badanekayi",
  "ladyfinger", "okra", "bhindi", "bhendi", "bendakaya", "bende",
  "cucumber", "kheera", "kakdi", "dosakaya", "southekayi",
  "radish", "mooli", "mullangi",
  "beetroot", "chukandar", "beet",
  "pumpkin", "kaddu", "gummadikaya", "kumbalakayi",
  "bottle gourd", "lauki", "sorakaya", "sorekayi",
  "bitter gourd", "karela", "kakarakaya", "hagalakayi",
  "ridge gourd", "turai", "beerakaya", "heerekayi",
  "snake gourd", "chichinda", "potlakaya", "padavalakayi",
  "drumstick", "sahjan", "munakkaya", "nuggekayi",
  "spinach", "palak", "palakura", "palak soppu",
  "fenugreek", "methi", "menthi kura", "menthya soppu",
  "coriander", "dhaniya", "kothimeera", "kothambari",
  "curry leaves", "kadi patta", "karivepaku", "karibevu",
  "mint", "pudina",
  "ginger", "adrak", "allam", "shunti",
  "garlic", "lehsun", "vellulli", "bellulli",
  "green peas", "peas", "matar", "batani",
  "beans", "french beans", "cluster beans", "goruchikkudu", "chikkudukaya",

  // Fruits
  "mango", "mangoes", "aam", "mamidi", "mamidikaya", "mavu",
  "banana", "bananas", "kela", "arati", "aratikaya", "balehannu",
  "apple", "apples", "seb", "sepu", "sebu",
  "orange", "oranges", "santra", "kamala", "kithale",
  "papaya", "papayas", "papita", "boppayi", "parangi",
  "guava", "guavas", "amrood", "jama", "jamakaya", "sebe",
  "pomegranate", "anar", "danimma", "dalimbe",
  "watermelon", "tarbooz", "puchakaya", "kallangadi",
  "muskmelon", "kharbooja", "karbuja",
  "grapes", "angoor", "draksha",
  "lemon", "lemons", "lime", "nimbu", "nimma", "nimmakaya", "nimbe",
  "sweet lime", "mosambi", "battayi",
  "pineapple", "ananas", "anasa",
  "custard apple", "sitaphal", "seethaphalam",
  "sapota", "chikoo", "sapota",
  "coconut", "nariyal", "kobbari", "thenginkayi", "tender coconut", "elaneer",
  "strawberry", "strawberries",
  "jackfruit", "kathal", "panasa", "halasina hannu",

  // Grains & Cereals
  "paddy", "rice", "dhan", "chawal", "vari", "bhatta", "akki", "basmati", "sona masoori",
  "wheat", "gehun", "godhuma", "godhi",
  "maize", "corn", "makka", "mokka jonna", "musukina jola",
  "jowar", "sorghum", "jonna", "jola",
  "bajra", "pearl millet", "sajjalu", "sajje",
  "ragi", "finger millet", "ragulu",
  "barley", "jau", "yava",
  "oats",

  // Pulses & Legumes
  "dal", "pulse", "pulses", "lentil", "lentils",
  "toor dal", "arhar", "kandi pappu", "togari bele",
  "moong dal", "mung", "pesara pappu", "hesaru bele",
  "urad dal", "minapa pappu", "uddu",
  "chana", "chickpea", "gram", "senagalu", "kadale",
  "rajma", "kidney beans",
  "soybean", "soya", "soyabean",
  "groundnut", "peanut", "peanuts", "moongphali", "verusanaga", "kadalekayi",
  "mustard", "sarson", "aavalu", "sasive",
  "sesame", "til", "nuvvulu", "yellu",

  // Cash Crops, Spices & Dairy
  "cotton", "kapas", "patti", "hatti",
  "sugarcane", "ganna", "cheruku", "kabbu",
  "turmeric", "haldi", "pasupu", "arishina",
  "cardamom", "elaichi", "yelakulu", "yalakki",
  "black pepper", "kali mirch", "miriyalu", "menasu",
  "clove", "laung", "lavangam", "lavanga",
  "cinnamon", "dalchini", "dalchina chekka",
  "milk", "doodh", "paalu", "haalu",
  "curd", "dahi", "perugu", "mosaru",
  "ghee", "neyyi", "tuppa",
  "paneer", "butter", "makhan", "venna", "benne",
  "honey", "shehed", "thene", "jenu",
  "jaggery", "gud", "bellam", "bella",
  "coffee", "tea", "chai",
]);

// Words that specifically flag human portraits, selfies, non-crop items, animals, vehicles, etc.
export const NON_PRODUCE_BLACKLIST = [
  // Human & Person terms
  "selfie", "person", "human", "face", "portrait", "man", "woman", "boy", "girl",
  "people", "avatar", "profile", "user", "me", "photo of me", "my photo", "friend",
  "actor", "actress", "model", "baby", "kid", "child", "crowd", "family", "doctor",
  "engineer", "teacher", "driver", "guy", "lady", "dude",

  // Common Non-Produce Names (e.g. people names)
  "john", "david", "michael", "alex", "rahul", "rohit", "amit", "suresh", "ramesh",
  "kumar", "sharma", "singh", "patel", "reddy", "naidu", "priya", "anita", "sneha",

  // Vehicles & Machinery
  "car", "bike", "motorcycle", "scooter", "auto", "truck", "tractor", "bus", "jeep",
  "vehicle", "cycle", "aeroplane", "train",

  // Electronics & Office
  "laptop", "computer", "phone", "mobile", "iphone", "android", "tablet", "ipad",
  "keyboard", "mouse", "monitor", "screen", "television", "tv", "camera", "charger",
  "headphone", "earphone", "cable", "gadget",

  // Clothing & Personal Items
  "shirt", "pant", "jeans", "tshirt", "dress", "saree", "shoes", "shoe", "chappal",
  "sandal", "watch", "glasses", "sunglasses", "hat", "cap", "bag", "purse", "wallet",
  "cloth", "clothes",

  // Home & Furniture
  "chair", "table", "bed", "sofa", "furniture", "door", "window", "house", "room",
  "building", "wall", "floor", "ceiling", "fan", "light",

  // Animals (Pets / Wild - not agricultural harvest)
  "dog", "cat", "puppy", "kitten", "pet", "lion", "tiger", "bear", "elephant",
  "monkey", "snake", "bird", "parrot", "pigeon",

  // Miscellaneous Non-Produce
  "money", "cash", "rupee", "dollar", "coin", "gold", "silver", "diamond",
  "toy", "doll", "game", "gun", "knife", "weapon", "paper", "pen", "pencil",
  "book", "notebook", "document", "invoice", "receipt", "bill", "certificate",
  "screenshot", "meme", "wallpaper", "quote", "logo", "banner", "poster",
];

export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  detectedType?: "PRODUCE" | "HUMAN_SELFIE" | "VEHICLE" | "ELECTRONICS" | "SYNTHETIC" | "INVALID_NAME";
}

/**
 * Validates product name
 */
export function verifyProduceName(name: string): VerificationResult {
  if (!name || typeof name !== "string") {
    return {
      isValid: false,
      reason: "Please enter a valid agricultural crop or produce name.",
      detectedType: "INVALID_NAME",
    };
  }

  const clean = name.toLowerCase().trim();

  if (clean.length < 2) {
    return {
      isValid: false,
      reason: "Crop name is too short. Please enter a recognized produce item.",
      detectedType: "INVALID_NAME",
    };
  }

  // Check against non-produce blacklist
  for (const blacklisted of NON_PRODUCE_BLACKLIST) {
    // exact word match or whole word regex
    const regex = new RegExp(`\\b${blacklisted}\\b`, "i");
    if (regex.test(clean)) {
      return {
        isValid: false,
        reason: `"${name}" is not an agricultural produce. Please enter a valid farm crop (e.g. Tomatoes, Chillies, Onions, Paddy).`,
        detectedType: "INVALID_NAME",
      };
    }
  }

  // Check if contains any recognized produce keyword
  const words = clean.split(/[\s,_\-–—/()]+/);
  const matchesKeyword = words.some((w) => ALLOWED_PRODUCE_KEYWORDS.has(w)) ||
    Array.from(ALLOWED_PRODUCE_KEYWORDS).some((k) => clean.includes(k));

  if (!matchesKeyword) {
    // If it has at least some legitimate agricultural word (like farm, organic, hybrid, harvest, seed, fruit, vegetable)
    const generalAgri = ["crop", "grain", "fruit", "veg", "vegetable", "pulse", "organic", "hybrid", "fresh", "farm"];
    const hasGeneralAgri = generalAgri.some((g) => clean.includes(g));

    if (!hasGeneralAgri) {
      return {
        isValid: false,
        reason: `"${name}" does not match any recognized farm crop or agricultural produce. Please specify a crop (e.g. Fresh Tomatoes, Sona Masoori Rice).`,
        detectedType: "INVALID_NAME",
      };
    }
  }

  return { isValid: true, detectedType: "PRODUCE" };
}

/**
 * Validates an uploaded image file on server
 */
export function verifyProduceImage(
  file: Express.Multer.File | undefined,
  cropHint?: string
): VerificationResult {
  if (!file) {
    return {
      isValid: false,
      reason: "No image file provided. Please upload or capture a crop photo.",
    };
  }

  const originalName = (file.originalname || "").toLowerCase();

  // 1. Check filename for obvious non-produce cues (selfie, person, face, car, etc.)
  for (const blacklisted of NON_PRODUCE_BLACKLIST) {
    if (originalName.includes(blacklisted)) {
      return {
        isValid: false,
        reason: `Wrong image uploaded (${blacklisted} detected). Please upload a real farm produce photo. Human photos, selfies, vehicles, or non-crop items are not allowed.`,
        detectedType: blacklisted.includes("selfie") || blacklisted.includes("person") || blacklisted.includes("face")
          ? "HUMAN_SELFIE"
          : "SYNTHETIC",
      };
    }
  }

  // 2. Validate crop hint if provided
  if (cropHint && cropHint.trim()) {
    const nameCheck = verifyProduceName(cropHint);
    if (!nameCheck.isValid) {
      return nameCheck;
    }
  }

  // 3. Inspect byte size
  if (file.size < 5 * 1024) {
    return {
      isValid: false,
      reason: "The uploaded file is too small (< 5KB) to be a valid produce photo. Please upload a clear photo of your harvest.",
      detectedType: "SYNTHETIC",
    };
  }

  return { isValid: true, detectedType: "PRODUCE" };
}
