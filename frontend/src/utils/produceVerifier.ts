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

  const clean = name.toLowerCase().trim();

  // Check blacklist with whole word matching
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

  return { isValid: true, detectedType: "PRODUCE" };
}

export type VerificationMode = "produce" | "leaf" | "general";


function getVerificationErrorMessage(
  type: string,
  lang: AppLang,
  customTag?: string
): string {
  switch (type) {
    case "HUMAN_SELFIE":
      if (lang === "te") {
        return "తప్పు చిత్రం! మనుషుల ముఖం లేదా సెల్ఫీ గుర్తించబడింది. ఈ AI కేవలం వ్యవసాయ పంటలు మరియు ఆకుల కోసం మాత్రమే. దయచేసి పంట లేదా ఆకుల ఫోటోను మాత్రమే అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "गलत तस्वीर! मानव चेहरा या सेल्फी पहचानी गई। यह AI केवल कृषि फसलों और पत्तियों के लिए है। कृपया वास्तविक फसल या पौधे की पत्ती की तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ತಪ್ಪು ಚಿತ್ರ! ಮಾನವ ಮುಖ ಅಥವಾ ಸೆಲ್ಫಿ ಪತ್ತೆಯಾಗಿದೆ. ಈ AI ಕೇವಲ ಕೃಷಿ ಬೆಳೆಗಳು ಮತ್ತು ಎಲೆಗಳಿಗಾಗಿ ಮಾತ್ರ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬೆಳೆ ಅಥವಾ ಎಲೆಯ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "Human face or selfie detected! The AI model only analyzes agricultural crops and plant leaves. Human photos cannot be diagnosed or graded.";

    case "ANIMAL":
      if (lang === "te") {
        return "జంతువు గుర్తించబడింది! దయచేసి వ్యవసాయ పంట లేదా ఉత్పత్తి ఫోటోను అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "जानवर पहचाना गया! कृपया कृषि फसल या फल-सब्जी की तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ! ದಯವಿಟ್ಟು ನಿಜವಾದ ಕೃಷಿ ಬೆಳೆ ಅಥವಾ ತರಕಾರಿಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "Animal detected! Please upload a photo of your agricultural crop or harvest.";

    case "SYNTHETIC":
    case "OBJECT":
      if (lang === "te") {
        return "కంప్యూటర్ స్క్రీన్ లేదా వ్యవసాయేతర వస్తువు గుర్తించబడింది. దయచేసి సహజమైన వ్యవసాయ పంట లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "स्क्रीन या गैर-कृषि वस्तु पहचानी गई। कृपया वास्तविक प्राकृतिक फसल की तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ಪರದೆ ಅಥವಾ ಕೃಷಿಯೇತರ ವಸ್ತು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನೈಸರ್ಗಿಕ ಕೃಷಿ ಬೆಳೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "Screen or non-agricultural item detected. Please upload an authentic photo of your crop or harvest.";

    case "NO_PLANT_DETECTED":
      if (lang === "te") {
        return "ఏ విధమైన పంట లేదా మొక్క ఆకులు గుర్తించబడలేదు! దయచేసి వ్యాధి సోకిన ఆకు లేదా పంటను వెలుతురులో స్పష్టంగా ఫోటో తీసి అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "कोई कृषि पौधा या पत्ती नहीं पहचानी गई! कृपया अच्छी रोशनी में रोगग्रस्त पत्ती या फसल की स्पष्ट तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ಯಾವುದೇ ಕೃಷಿ ಬೆಳೆ ಅಥವಾ ಎಲೆ ಪತ್ತೆಯಾಗಿಲ್ಲ! ದಯವಿಟ್ಟು ಬಾಧಿತ ಎಲೆ ಅಥವಾ ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "No agricultural crop or plant leaf detected in this photo! Please upload a clear close-up of the crop or affected foliage in good lighting.";

    default:
      if (customTag) return `Wrong image (${customTag} detected). Please upload a real farm produce photo.`;
      return "Invalid image. Please upload a clear photo of your farm crop or leaf.";
  }
}

/**
 * Validates image on client using lenient inspection to accept all genuine produce, leaves, and hand-held crops
 */
export async function validateProduceImage(
  file: File,
  lang: AppLang = "en",
  _mode: VerificationMode = "general"
): Promise<ClientVerificationResult> {
  const baseName = (file.name || "").toLowerCase().replace(/\.[^/.]+$/, "");

  // 1. Strict filename blacklist check (only explicit words like 'selfie', 'passport_photo', etc.)
  for (const b of NON_PRODUCE_BLACKLIST) {
    const reg = new RegExp(`\\b${b}\\b`, "i");
    if (reg.test(baseName)) {
      const isHuman = b.includes("selfie") || b.includes("portrait") || b.includes("headshot");
      const type = isHuman ? "HUMAN_SELFIE" : "OBJECT";
      return {
        isValid: false,
        error: getVerificationErrorMessage(type, lang, b),
        detectedType: type,
      };
    }
  }

  // 2. Minimum file size check (< 100 bytes is empty/corrupt)
  if (file.size < 100) {
    return {
      isValid: false,
      error:
        lang === "te"
          ? "ఫోటో నాణ్యత చాలా తక్కువగా ఉంది. దయచేసి స్పష్టమైన పంట ఫోటోను అప్‌లోడ్ చేయండి."
          : lang === "hi"
          ? "तस्वीर का आकार बहुत छोटा है। कृपया फसल की स्पष्ट तस्वीर अपलोड करें।"
          : lang === "kn"
          ? "ಚಿತ್ರದ ಗುಣಮಟ್ಟ ತುಂಬಾ ಕಡಿಮೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
          : "Photo file is empty or corrupted. Please upload a clear photo of your produce or leaf.",
      detectedType: "SYNTHETIC",
    };
  }

  // 3. Native hardware FaceDetector if supported (only flag if close-up face with no produce context)
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const width = 120;
      const height = 120;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        const FaceDetectorClass = (window as any).FaceDetector;
        const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(canvas);
        if (Array.isArray(faces) && faces.length > 0) {
          // If a large face occupies > 60% of frame (close selfie), reject
          const face = faces[0].boundingBox;
          if (face && (face.width * face.height) / (width * height) > 0.45) {
            return {
              isValid: false,
              error: getVerificationErrorMessage("HUMAN_SELFIE", lang),
              detectedType: "HUMAN_SELFIE",
            };
          }
        }
      }
    } catch {
      // Ignore if FaceDetector is unavailable
    }
  }

  // Default to valid produce so all agricultural photos, leaves, and produce are accepted
  return { isValid: true, detectedType: "PRODUCE" };
}

