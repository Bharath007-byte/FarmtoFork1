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
        return "జంతువు లేదా పెంపుడు జంతువు గుర్తించబడింది! దయచేసి వ్యవసాయ పంట లేదా ఉత్పత్తి ఫోటోను అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "जानवर या पालतू पशु पहचाना गया! कृपया कृषि फसल या फल-सब्जी की तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ! ದಯವಿಟ್ಟು ನಿಜವಾದ ಕೃಷಿ ಬೆಳೆ ಅಥವಾ ತರಕಾರಿಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "Animal or pet detected! Please upload a photo of your agricultural crop or harvest.";

    case "SYNTHETIC":
    case "OBJECT":
      if (lang === "te") {
        return "కంప్యూటర్ స్క్రీన్ లేదా వ్యవసాయేతర వస్తువు గుర్తించబడింది. దయచేసి సహజమైన వ్యవసాయ పంట లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయండి.";
      }
      if (lang === "hi") {
        return "स्क्रीन, दस्तावेज या गैर-कृषि वस्तु पहचानी गई। कृपया वास्तविक प्राकृतिक फसल की तस्वीर अपलोड करें।";
      }
      if (lang === "kn") {
        return "ಪರದೆ ಅಥವಾ ಕೃಷಿಯೇತರ ವಸ್ತು ಪತ್ತೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನೈಸರ್ಗಿಕ ಕೃಷಿ ಬೆಳೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.";
      }
      return "Screen, indoor object, or non-agricultural item detected. Please upload an authentic photo of your crop or harvest.";

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
 * Validates image on client using Native FaceDetector, YCbCr skin clustering, and chlorophyll chrominance
 */
export async function validateProduceImage(
  file: File,
  lang: AppLang = "en",
  mode: VerificationMode = "general"
): Promise<ClientVerificationResult> {
  const filename = (file.name || "").toLowerCase();

  // 1. Filename heuristic
  for (const b of NON_PRODUCE_BLACKLIST) {
    if (filename.includes(b)) {
      const isHuman = b.includes("selfie") || b.includes("person") || b.includes("face") || b.includes("user") || b.includes("photo");
      const isAnimal = b.includes("dog") || b.includes("cat") || b.includes("pet") || b.includes("lion") || b.includes("tiger") || b.includes("bird");
      const type = isHuman ? "HUMAN_SELFIE" : isAnimal ? "ANIMAL" : "OBJECT";
      return {
        isValid: false,
        error: getVerificationErrorMessage(type, lang, b),
        detectedType: type,
      };
    }
  }

  // 2. Minimum file size check (< 4KB is likely a thumbnail or icon)
  if (file.size < 4 * 1024) {
    return {
      isValid: false,
      error:
        lang === "te"
          ? "ఫోటో నాణ్యత చాలా తక్కువగా ఉంది. దయచేసి స్పష్టమైన పంట ఫోటోను అప్‌లోడ్ చేయండి."
          : lang === "hi"
          ? "तस्वीर का आकार बहुत छोटा है। कृपया फसल की स्पष्ट तस्वीर अपलोड करें।"
          : lang === "kn"
          ? "ಚಿತ್ರದ ಗುಣಮಟ್ಟ ತುಂಬಾ ಕಡಿಮೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
          : "Photo resolution is too low. Please upload a clear photo of your produce or leaf.",
      detectedType: "SYNTHETIC",
    };
  }

  // 3. Multi-color space & Computer Vision inspection
  try {
    const bitmap = await createImageBitmap(file);
    const width = 80;
    const height = 80;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { isValid: true, detectedType: "PRODUCE" };

    ctx.drawImage(bitmap, 0, 0, width, height);

    // 3a. Hardware-Accelerated Native Face Detection (Chrome / Android / Chromium)
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        const FaceDetectorClass = (window as any).FaceDetector;
        const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(canvas);
        if (Array.isArray(faces) && faces.length > 0) {
          return {
            isValid: false,
            error: getVerificationErrorMessage("HUMAN_SELFIE", lang),
            detectedType: "HUMAN_SELFIE",
          };
        }
      } catch {
        // Fall back to pixel color space analysis if FaceDetector is restricted by flags
      }
    }

    const imgData = ctx.getImageData(0, 0, width, height).data;
    const totalPixels = width * height;

    let skinPixels = 0;
    let centerSkinPixels = 0;
    let greenPlantPixels = 0;
    let colorfulProducePixels = 0;
    let grayPixels = 0;
    let neutralAnimalFurPixels = 0;

    const centerX = width / 2;
    const centerY = height / 2;
    const centerRadiusSq = (width * 0.38) * (width * 0.38);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];

        // --- YCbCr Color Space Conversion ---
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
        const Cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;

        // --- Skin Tone Classifier (Universal South Asian & Global Melanin Cluster) ---
        const isYCbCrSkin = Cr >= 132 && Cr <= 176 && Cb >= 76 && Cb <= 128;
        const isRgbSkin = r > 35 && r > g && g >= b * 0.78 && (r - g) >= 4;

        if (isYCbCrSkin && isRgbSkin) {
          skinPixels++;
          const distSq = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
          if (distSq <= centerRadiusSq) {
            centerSkinPixels++;
          }
        }

        // --- Green Chlorophyll / Plant Foliage ---
        // Leaf Green: Green dominates, or moderate hue with green component
        const isGreenLeaf =
          (g > r * 1.06 && g > b * 1.12 && g > 35) ||
          (g > 65 && r < 140 && b < 110 && g - r > 12);
        if (isGreenLeaf) {
          greenPlantPixels++;
        }

        // --- Vivid Agricultural Produce Pigmentation ---
        // Ripe Red (Tomato, Red Chilli, Apple, Strawberry)
        const isProduceRed = r > 75 && r > g * 1.25 && r > b * 1.35;
        // Orange / Golden Yellow (Mango, Banana, Carrot, Turmeric, Corn)
        const isProduceYellow = r > 105 && g > 85 && b < 95 && (r + g) > b * 2.3;
        // Purple / Eggplant (Brinjal, Beetroot, Red Cabbage, Jamun)
        const isProducePurple = r > 55 && b > 55 && g < Math.max(r, b) * 0.8;
        // Onion / Garlic / Potato earthy outer skin
        const isEarthyProduce = r >= 110 && g >= 90 && b >= 50 && r >= g && g >= b && (r - b) >= 20 && (r - b) <= 90;

        if (isProduceRed || isProduceYellow || isProducePurple || isEarthyProduce) {
          colorfulProducePixels++;
        }

        // --- Monochromatic / Screen / Indoor Surface Grayscale ---
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        if (maxDiff < 10) {
          grayPixels++;
        }

        // --- Neutral Animal Fur (Tans, grays, black-white without vegetation) ---
        if (maxDiff < 16 && Y > 30 && Y < 220) {
          neutralAnimalFurPixels++;
        }
      }
    }

    const skinRatio = skinPixels / totalPixels;
    const centerTotal = Math.PI * (width * 0.38) * (width * 0.38);
    const centerSkinRatio = centerSkinPixels / centerTotal;
    const greenPlantRatio = greenPlantPixels / totalPixels;
    const produceRatio = colorfulProducePixels / totalPixels;
    const totalAgriRatio = greenPlantRatio + produceRatio;
    const grayRatio = grayPixels / totalPixels;
    const neutralFurRatio = neutralAnimalFurPixels / totalPixels;

    // --- DECISION LOGIC ---

    // 1. Human Face or Selfie Rejection
    // If center of photo is dominated by skin tones (>15%) or overall skin is >17%
    if (centerSkinRatio > 0.15 || skinRatio > 0.17) {
      return {
        isValid: false,
        error: getVerificationErrorMessage("HUMAN_SELFIE", lang),
        detectedType: "HUMAN_SELFIE",
      };
    }

    // 2. Monochromatic Indoor Screen / Wall / Document
    if (grayRatio > 0.65 && totalAgriRatio < 0.05) {
      return {
        isValid: false,
        error: getVerificationErrorMessage("SYNTHETIC", lang),
        detectedType: "SYNTHETIC",
      };
    }

    // 3. Animal / Pet Fur
    if (neutralFurRatio > 0.55 && totalAgriRatio < 0.04) {
      return {
        isValid: false,
        error: getVerificationErrorMessage("ANIMAL", lang),
        detectedType: "ANIMAL",
      };
    }

    // 4. Mode-Specific Check: "leaf" (Krishi AI Doctor)
    // A leaf photo must have detectable chlorophyll or plant tissue
    if (mode === "leaf") {
      if (greenPlantRatio < 0.06 && totalAgriRatio < 0.08) {
        return {
          isValid: false,
          error: getVerificationErrorMessage("NO_PLANT_DETECTED", lang),
          detectedType: "NO_PLANT_DETECTED",
        };
      }
    }

    // 5. Mode-Specific Check: "produce" (Produce Grading & Marketplace)
    if (mode === "produce") {
      if (totalAgriRatio < 0.06 && grayRatio > 0.40) {
        return {
          isValid: false,
          error: getVerificationErrorMessage("OBJECT", lang),
          detectedType: "OBJECT",
        };
      }
    }
  } catch (err) {
    console.warn("Client image inspection warning:", err);
  }

  return { isValid: true, detectedType: "PRODUCE" };
}

