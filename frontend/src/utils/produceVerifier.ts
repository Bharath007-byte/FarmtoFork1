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
  // Human & Person
  "selfie", "person", "human", "face", "portrait", "man", "woman", "boy", "girl",
  "people", "avatar", "profile", "user", "me", "my photo", "friend", "baby", "kid",
  "doctor", "engineer", "teacher", "driver", "guy", "lady",
  "john", "david", "michael", "alex", "rahul", "rohit", "amit", "suresh", "ramesh",
  "kumar", "sharma", "singh", "patel", "reddy", "naidu", "priya", "anita",

  // Vehicles
  "car", "bike", "motorcycle", "scooter", "auto", "truck", "tractor", "bus", "jeep", "vehicle",

  // Electronics
  "laptop", "computer", "phone", "mobile", "iphone", "android", "tablet", "screen",
  "camera", "charger", "keyboard", "mouse", "tv",

  // Clothes & Accessories
  "shirt", "pant", "jeans", "dress", "saree", "shoes", "shoe", "watch", "glasses", "bag", "cloth",

  // Furniture & Buildings
  "chair", "table", "bed", "sofa", "furniture", "house", "room", "building", "wall",

  // Animals
  "dog", "cat", "puppy", "kitten", "pet", "lion", "tiger", "snake", "bird",

  // Others
  "money", "cash", "rupee", "dollar", "coin", "gold", "toy", "gun", "knife", "document",
  "bill", "receipt", "screenshot", "meme", "wallpaper",
];

export interface ClientVerificationResult {
  isValid: boolean;
  error?: string;
  detectedType?: "PRODUCE" | "HUMAN_SELFIE" | "VEHICLE" | "ELECTRONICS" | "SYNTHETIC" | "INVALID_NAME";
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

  const clean = name.toLowerCase().trim();

  // Check blacklist
  for (const item of NON_PRODUCE_BLACKLIST) {
    const reg = new RegExp(`\\b${item}\\b`, "i");
    if (reg.test(clean)) {
      return {
        isValid: false,
        error:
          lang === "te"
            ? `"${name}" అనేది పంట లేదా వ్యవసాయ ఉత్పత్తి కాదు. దయచేసి సరైన పంట పేరును నమోదు చేయండి (ఉదా: టమోటా, ఉల్లిపాయ, మిర్చి, వరి).`
            : lang === "hi"
            ? `"${name}" कृषि उपज नहीं है। कृपया वैध फसल का नाम दर्ज करें (उदा. टमाटर, प्याज, मिर्च, धान)।`
            : lang === "kn"
            ? `"${name}" ಕೃಷಿ ಉತ್ಪನ್ನವಲ್ಲ. ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಬೆಳೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ (ಉದಾ. ಟೊಮ್ಯಾಟೊ, ಈರುಳ್ಳಿ, ಮೆಣಸಿನಕಾಯಿ, ಭತ್ತ).`
            : `"${name}" is not a recognized agricultural crop. Please enter a valid farm produce (e.g. Tomatoes, Onions, Chillies, Paddy).`,
        detectedType: "INVALID_NAME",
      };
    }
  }

  // Check keyword match
  const words = clean.split(/[\s,_\-–—/()]+/);
  const matchesKeyword =
    words.some((w) => ALLOWED_PRODUCE_KEYWORDS.has(w)) ||
    Array.from(ALLOWED_PRODUCE_KEYWORDS).some((k) => clean.includes(k));

  if (!matchesKeyword) {
    const generalAgri = ["crop", "grain", "fruit", "veg", "vegetable", "pulse", "organic", "hybrid", "fresh", "farm"];
    const hasGeneralAgri = generalAgri.some((g) => clean.includes(g));

    if (!hasGeneralAgri) {
      return {
        isValid: false,
        error:
          lang === "te"
            ? `"${name}" గుర్తింపు పొందిన పంట కాదు. దయచేసి సరైన వ్యవసాయ పంట పేరు నమోదు చేయండి.`
            : lang === "hi"
            ? `"${name}" किसी मान्यता प्राप्त कृषि उपज से मेल नहीं खाता। कृपया फसल का नाम सही लिखें।`
            : lang === "kn"
            ? `"${name}" ಯಾವುದೇ ಮಾನ್ಯತೆ ಪಡೆದ ಕೃಷಿ ಬೆಳೆಗೆ ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಬೆಳೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.`
            : `"${name}" does not match recognized agricultural produce. Please specify a real farm crop (e.g. Fresh Tomatoes, Sona Masoori Rice).`,
        detectedType: "INVALID_NAME",
      };
    }
  }

  return { isValid: true, detectedType: "PRODUCE" };
}

/**
 * Validates image on client using HTML5 Canvas pixel analysis & filename heuristics
 */
export async function validateProduceImage(
  file: File,
  lang: AppLang = "en"
): Promise<ClientVerificationResult> {
  const filename = (file.name || "").toLowerCase();

  // 1. Filename heuristic
  for (const b of NON_PRODUCE_BLACKLIST) {
    if (filename.includes(b)) {
      return {
        isValid: false,
        error:
          lang === "te"
            ? `ఇది తప్పు చిత్రం (${b} గుర్తించబడింది). దయచేసి మీ పంట లేదా వ్యవసాయ ఉత్పత్తుల ఫోటోను మాత్రమే అప్‌లోడ్ చేయండి. మనుషుల ఫోటోలు లేదా ఇతర వస్తువులు అనుమతించబడవు.`
            : lang === "hi"
            ? `यह गलत तस्वीर है (${b} पहचानी गई)। कृपया केवल कृषि उपज की वास्तविक तस्वीर अपलोड करें। मानव चेहरे, सेल्फी या अन्य वस्तुएं स्वीकार्य नहीं हैं।`
            : lang === "kn"
            ? `ಇದು ತಪ್ಪು ಚಿತ್ರ (${b} ಪತ್ತೆಯಾಗಿದೆ). ದಯವಿಟ್ಟು ನಿಮ್ಮ ಕೃಷಿ ಬೆಳೆಯ ನೈಜ ಫೋಟೋವನ್ನು ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಮಾನವ ಮುಖಗಳು ಅಥವಾ ಇತರ ವಸ್ತುಗಳನ್ನು ಅನುಮತಿಸಲಾಗುವುದಿಲ್ಲ.`
            : `This is a wrong image (${b} detected). Please upload a valid farm produce/crop photo. Human photos, selfies, vehicles, or non-crop objects cannot be accepted.`,
        detectedType: b.includes("selfie") || b.includes("person") || b.includes("face") ? "HUMAN_SELFIE" : "SYNTHETIC",
      };
    }
  }

  // 2. Minimum file size check (< 5KB is likely a thumbnail or icon)
  if (file.size < 5 * 1024) {
    return {
      isValid: false,
      error:
        lang === "te"
          ? "ఫోటో నాణ్యత చాలా తక్కువగా ఉంది. దయచేసి స్పష్టమైన పంట ఫోటోను అప్‌లోడ్ చేయండి."
          : lang === "hi"
          ? "तस्वीर का आकार बहुत छोटा है। कृपया फसल की स्पष्ट तस्वीर अपलोड करें।"
          : lang === "kn"
          ? "ಚಿತ್ರದ ಗುಣಮಟ್ಟ ತುಂಬಾ ಕಡಿಮೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
          : "Photo size is too small. Please upload a clear photo of your produce.",
      detectedType: "SYNTHETIC",
    };
  }

  // 3. Canvas pixel skin tone & grayscale analysis
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const width = 64;
    const height = 64;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { isValid: true, detectedType: "PRODUCE" };

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height).data;

    let skinPixels = 0;
    let grayPixels = 0;
    let centerSkinPixels = 0;
    const totalPixels = width * height;

    const centerX = width / 2;
    const centerY = height / 2;
    const centerRadiusSq = (width * 0.35) * (width * 0.35);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];

        // Standard Human Skin Tone Color Range
        const isSkin =
          r > 90 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g >= 15 &&
          Math.abs(r - g) > 10 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          r < 250 &&
          g < 225 &&
          b < 205;

        if (isSkin) {
          skinPixels++;
          const distSq = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
          if (distSq <= centerRadiusSq) {
            centerSkinPixels++;
          }
        }

        // Monochromatic / Metallic / Paper / Screen Grayscale
        const isGray = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10;
        if (isGray) {
          grayPixels++;
        }
      }
    }

    const skinRatio = skinPixels / totalPixels;
    const centerTotal = Math.PI * (width * 0.35) * (width * 0.35);
    const centerSkinRatio = centerSkinPixels / centerTotal;
    const grayRatio = grayPixels / totalPixels;

    // Detect human portrait or selfie (high skin concentration, especially in center face area)
    if (centerSkinRatio > 0.40 || skinRatio > 0.45) {
      return {
        isValid: false,
        error:
          lang === "te"
            ? "ఇది తప్పు చిత్రం! మనుషుల లేదా సెల్ఫీ ఫోటో గుర్తించబడింది. దయచేసి మీ పంట లేదా కూరగాయలు/పండ్ల ఫోటోను మాత్రమే అప్‌లోడ్ చేయండి."
            : lang === "hi"
            ? "यह गलत तस्वीर है! मानव चेहरा/सेल्फी पहचानी गई। कृपया केवल फसल या फल-सब्जियों की स्पष्ट तस्वीर अपलोड करें।"
            : lang === "kn"
            ? "ಇದು ತಪ್ಪು ಚಿತ್ರ! ಮಾನವ ಮುಖ/ಸೆಲ್ಫಿ ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಕೃಷಿ ಬೆಳೆ ಅಥವಾ ತರಕಾರಿ/ಹಣ್ಣುಗಳ ಫೋಟೋವನ್ನು ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
            : "Wrong image detected! Human portrait or selfie detected. Please upload an actual photo of your harvest or farm produce.",
        detectedType: "HUMAN_SELFIE",
      };
    }

    // Detect artificial monochromatic screens/documents/laptops
    if (grayRatio > 0.82) {
      return {
        isValid: false,
        error:
          lang === "te"
            ? "ఇది తప్పు చిత్రం! కంప్యూటర్ స్క్రీన్ లేదా ఇతర వస్తువు గుర్తించబడింది. దయచేసి సహజమైన పంట ఫోటోను అప్‌లోడ్ చేయండి."
            : lang === "hi"
            ? "यह गलत तस्वीर है! स्क्रीन या गैर-कृषि वस्तु पहचानी गई। कृपया प्राकृतिक फसल की तस्वीर अपलोड करें।"
            : lang === "kn"
            ? "ಇದು ತಪ್ಪು ಚಿತ್ರ! ಪರದೆ ಅಥವಾ ಕೃಷಿಯೇತರ ವಸ್ತು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನೈಸರ್ಗಿಕ ಬೆಳೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
            : "Wrong image detected! Screen, document, or non-crop object detected. Please upload a clear photo of real farm produce.",
        detectedType: "SYNTHETIC",
      };
    }
  } catch (err) {
    // If canvas analysis throws (e.g. unusual format), continue to backend validation
    console.warn("Client image inspection skipped:", err);
  }

  return { isValid: true, detectedType: "PRODUCE" };
}
