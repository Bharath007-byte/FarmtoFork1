import type { AppLang } from "../i18n";

export const ALLOWED_PRODUCE_KEYWORDS = new Set([
  // Vegetables
  "tomato", "tomatoes", "tamatar", "tamata", "tamato",
  "potato", "potatoes", "aloo", "alu", "bangaladumpa",
  "onion", "onions", "pyaz", "ullipaya", "eerulli",
  "chilli", "chili", "chillies", "mirchi", "mirapa", "pachimirapa", "menasinakai",
  "capsicum", "shimla mirch", "bengaluru mirapa",
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
  "drumstick", "sahjan", "munakkaya", "nuggekayi",
  "spinach", "palak", "palakura",
  "fenugreek", "methi", "menthi kura",
  "coriander", "dhaniya", "kothimeera",
  "curry leaves", "kadi patta", "karivepaku",
  "mint", "pudina",
  "ginger", "adrak", "allam",
  "garlic", "lehsun", "vellulli",
  "peas", "matar", "batani",
  "beans", "chikkudu",

  // Fruits
  "mango", "mangoes", "aam", "mamidi", "mamidikaya", "mavu",
  "banana", "bananas", "kela", "arati", "aratikaya", "balehannu",
  "apple", "apples", "seb", "sepu", "sebu",
  "orange", "oranges", "santra", "kamala",
  "papaya", "papayas", "papita", "boppayi",
  "guava", "guavas", "amrood", "jama", "jamakaya",
  "pomegranate", "anar", "danimma",
  "watermelon", "tarbooz", "puchakaya",
  "muskmelon", "kharbooja", "karbuja",
  "grapes", "angoor", "draksha",
  "lemon", "lemons", "lime", "nimbu", "nimma", "nimmakaya",
  "pineapple", "ananas",
  "custard apple", "sitaphal", "seethaphalam",
  "sapota", "chikoo",
  "coconut", "nariyal", "kobbari",

  // Grains & Cereals
  "paddy", "rice", "dhan", "chawal", "vari", "bhatta", "akki", "basmati", "sona masoori",
  "wheat", "gehun", "godhuma", "godhi",
  "maize", "corn", "makka", "mokka jonna",
  "jowar", "sorghum", "jonna",
  "bajra", "pearl millet", "sajjalu",
  "ragi", "finger millet", "ragulu",

  // Pulses
  "dal", "pulse", "pulses", "lentil", "lentils",
  "toor dal", "arhar", "kandi pappu",
  "moong dal", "mung", "pesara pappu",
  "urad dal", "minapa pappu",
  "chana", "chickpea", "gram", "senagalu",
  "rajma",
  "soybean", "soya",
  "groundnut", "peanut", "moongphali", "verusanaga",
  "mustard", "sarson", "aavalu",
  "sesame", "til", "nuvvulu",

  // Cash Crops, Spices & Dairy
  "cotton", "kapas", "patti",
  "sugarcane", "ganna", "cheruku",
  "turmeric", "haldi", "pasupu",
  "cardamom", "elaichi", "yelakulu",
  "pepper", "kali mirch", "miriyalu",
  "milk", "doodh", "paalu",
  "curd", "dahi", "perugu",
  "ghee", "neyyi",
  "paneer", "butter", "makhan", "venna",
  "honey", "shehed", "thene",
]);

export const NON_PRODUCE_BLACKLIST = [
  // Human & Person explicit terms (only strict terms, no generic camera words like 'photo' or 'image')
  "selfie", "portrait", "headshot", "passport_photo",

  // Vehicles
  "motorcycle", "scooter", "truck", "tractor", "bus", "jeep",

  // Electronics
  "laptop", "keyboard", "monitor", "television",

  // Others
  "screenshot", "meme", "wallpaper",
];

export interface ClientVerificationResult {
  isValid: boolean;
  error?: string;
  detectedType?:
    | "PRODUCE"
    | "HUMAN_SELFIE"
    | "VEHICLE"
    | "ELECTRONICS"
    | "ANIMAL"
    | "OBJECT"
    | "SYNTHETIC"
    | "NO_PLANT_DETECTED"
    | "INVALID_NAME";
}

/**
 * Validates crop name on client with localized error messages
 */
export function validateCropName(name: string, lang: AppLang = "en"): ClientVerificationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error:
        lang === "te"
          ? "దయచేసి పంట పేరును నమోదు చేయండి."
          : lang === "hi"
          ? "कृपया फसल का नाम दर्ज करें।"
          : lang === "kn"
          ? "ದಯವಿಟ್ಟು ಬೆಳೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ."
          : "Please enter a crop name.",
      detectedType: "INVALID_NAME",
    };
  }

  return { isValid: true, detectedType: "PRODUCE" };
}

export type VerificationMode = "produce" | "leaf" | "general";

/**
 * Validates image on client - accepts all uploaded crop, leaf, and farm harvest images
 */
export async function validateProduceImage(
  _file: File,
  _lang: AppLang = "en",
  _mode: VerificationMode = "general"
): Promise<ClientVerificationResult> {
  return { isValid: true, detectedType: "PRODUCE" };
}
