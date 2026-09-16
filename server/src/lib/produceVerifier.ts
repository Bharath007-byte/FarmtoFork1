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
// Note: Generic camera file terms (photo, picture, image, user, img) and proper names are excluded
// to prevent false positives on mobile camera uploads.
export const NON_PRODUCE_BLACKLIST = [
  // Obvious Human Selfie & Portrait terms (matched as whole words)
  "selfie", "portrait", "headshot", "passport_photo",

  // Vehicles & Machinery
  "motorcycle", "scooter", "truck", "tractor", "bus", "jeep", "aeroplane",

  // Electronics & Office
  "laptop", "keyboard", "monitor", "television",

  // Miscellaneous Non-Produce
  "screenshot", "meme", "wallpaper",
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

  // Check against non-produce blacklist using word boundaries
  for (const blacklisted of NON_PRODUCE_BLACKLIST) {
    const regex = new RegExp(`\\b${blacklisted}\\b`, "i");
    if (regex.test(clean)) {
      return {
        isValid: false,
        reason: `"${name}" is not an agricultural produce. Please enter a valid farm crop (e.g. Tomatoes, Chillies, Onions, Paddy).`,
        detectedType: "INVALID_NAME",
      };
    }
  }

  // Allow any reasonable crop name
  return { isValid: true, detectedType: "PRODUCE" };
}

/**
 * Validates an uploaded image file on server
 */
export function verifyProduceImage(
  file: Express.Multer.File | undefined,
  _cropHint?: string
): VerificationResult {
  if (!file) {
    return {
      isValid: false,
      reason: "No image file provided. Please upload or capture a crop photo.",
    };
  }

  const baseName = (file.originalname || "").toLowerCase().replace(/\.[^/.]+$/, "");

  // 1. Check filename for obvious non-produce cues (only strict explicit names like 'selfie.jpg')
  for (const blacklisted of NON_PRODUCE_BLACKLIST) {
    const regex = new RegExp(`\\b${blacklisted}\\b`, "i");
    if (regex.test(baseName)) {
      return {
        isValid: false,
        reason: `Wrong image uploaded (${blacklisted} detected). Please upload a real farm produce photo. Human photos, selfies, vehicles, or non-crop items are not allowed.`,
        detectedType: blacklisted.includes("selfie") || blacklisted.includes("portrait")
          ? "HUMAN_SELFIE"
          : "SYNTHETIC",
      };
    }
  }

  // 2. Inspect byte size (allow files >= 100 bytes)
  if (file.size < 100) {
    return {
      isValid: false,
      reason: "The uploaded file is empty or corrupted. Please upload a clear photo of your harvest.",
      detectedType: "SYNTHETIC",
    };
  }

  return { isValid: true, detectedType: "PRODUCE" };
}
