import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppLang = "en" | "hi" | "te" | "kn";

export interface LangOption {
  code: AppLang;
  label: string;
  native: string;
}

export const SUPPORTED_LANGUAGES: LangOption[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
];

const dict: Record<AppLang, Record<string, string>> = {
  en: {
    brandName: "Samruddhi Setu",
    pillBadge: "FARMER · DIRECT · FAIR",
    heroQuote: "Bridging India's harvest directly to your home — fresh, fair, and pure.",
    tagline: "Fresh From Farm · Fair To Fork",
    motto: "Connecting Farmers, Consumers, and Logistics Directly",
    home: "Home",
    about: "About",
    shop: "Shop",
    services: "Services",
    farmer: "Farmer",
    logistics: "Logistics",
    map: "Agri Map",
    cart: "Cart",
    signIn: "Sign In",
    signUp: "Join Us",
    exploreShop: "Explore Marketplace",
    joinFamily: "Join Our Family",
    farmerPortal: "Visit Farmer Portal",
    logisticsPortal: "Visit Logistics Portal",
    registerFarmer: "Register as Farmer",
    registerConsumer: "Register as Consumer",
    registerLogistics: "Register Delivery Partner",
    aiScanner: "AI Produce Scanner",
    voiceAssistant: "Farmer Voice Assistant",
    mandiPrice: "Mandi Price",
    proceedToDelivery: "Proceed to Delivery",
    allCategories: "All Produce",
    searchPlaceholder: "Search crops, vegetables, fruits, dairy...",
    inStock: "Available",
    farmAI: "FarmAI",
    twin: "Digital Twin",
    admin: "Command Center",
    waste: "Waste Desk",
    ask: "Ask FarmAI",
    voice: "Ask by Voice",
    upload: "Upload Crop Photo",
    demo: "Real-time Verified Agricultural Intelligence",
  },
  hi: {
    brandName: "समृद्धि सेतु",
    pillBadge: "किसान · प्रत्यक्ष · न्यायसंगत",
    heroQuote: "भारत की उपज को सीधे आपके घर से जोड़ना — ताज़ा, निष्पक्ष और शुद्ध।",
    tagline: "खेत से थाली तक · ताज़ा और निष्पक्ष",
    motto: "किसानों, उपभोक्ताओं और लॉजिस्टिक्स को सीधा जोड़ना",
    home: "होम",
    about: "हमारे बारे में",
    shop: "दुकान",
    services: "सेवाएं",
    farmer: "किसान",
    logistics: "लॉजिस्टिक्स",
    map: "कृषि मानचित्र",
    cart: "टोकरी",
    signIn: "लॉग इन",
    signUp: "शामिल हों",
    exploreShop: "बाज़ार देखें",
    joinFamily: "हमारे परिवार से जुड़ें",
    farmerPortal: "किसान पोर्टल",
    logisticsPortal: "लॉजिस्टिक्स पोर्टल",
    registerFarmer: "किसान पंजीकरण",
    registerConsumer: "ग्राहक पंजीकरण",
    registerLogistics: "डिलीवरी पार्टनर पंजीकरण",
    aiScanner: "एआई फसल गुणवत्ता स्कैनर",
    voiceAssistant: "किसान वॉइस असिस्टेंट",
    mandiPrice: "मंडी भाव",
    proceedToDelivery: "डिलीवरी के लिए आगे बढ़ें",
    allCategories: "सभी उपज",
    searchPlaceholder: "फसल, सब्ज़ियाँ, फल, डेयरी खोजें...",
    inStock: "उपलब्ध",
    farmAI: "फार्मएआई",
    twin: "डिजिटल ट्विन",
    admin: "कमांड सेंटर",
    waste: "अपव्यय डेस्क",
    ask: "फार्मएआई से पूछें",
    voice: "आवाज़ से पूछें",
    upload: "फ़सल की तस्वीर अपलोड करें",
    demo: "सत्यापित कृषि डेटा एवं मंडी दरें",
  },
  te: {
    brandName: "సమృద్ధి సేతు",
    pillBadge: "రైతు · ప్రత్యక్షం · న్యాయబద్ధం",
    heroQuote: "భారతీయ పంటను నేరుగా మీ ఇంటికి చేర్చే వారధి — స్వచ్ఛం, న్యాయం, సహజం.",
    tagline: "పొలం నుండి పళ్లెం వరకు · స్వచ్ఛం మరియు న్యాయం",
    motto: "రైతులు, వినియోగదారులు మరియు రవాణాను నేరుగా కలపడం",
    home: "హోమ్",
    about: "మా గురించి",
    shop: "సంత / షాప్",
    services: "సేవలు",
    farmer: "రైతు",
    logistics: "రవాణా / లాజిస్టిక్స్",
    map: "వ్యవసాయ పటం",
    cart: "బుట్ట",
    signIn: "లాగిన్",
    signUp: "చేరండి",
    exploreShop: "మార్కెట్ చూడండి",
    joinFamily: "మా కుటుంబంలో చేరండి",
    farmerPortal: "రైతు పోర్టల్",
    logisticsPortal: "లాజిస్టిక్స్ పోర్టల్",
    registerFarmer: "రైతుగా నమోదు చేసుకోండి",
    registerConsumer: "వినియోగదారు నమోదు",
    registerLogistics: "రవాణా భాగస్వామి నమోదు",
    aiScanner: "AI పంట నాణ్యత స్కానర్",
    voiceAssistant: "రైతు వాయిస్ అసిస్టెంట్",
    mandiPrice: "మార్కెట్ ధర",
    proceedToDelivery: "డెలివరీకి కొనసాగండి",
    allCategories: "అన్ని ఉత్పత్తులు",
    searchPlaceholder: "పంటలు, కూరగాయలు, పండ్లు, పాలు వెతకండి...",
    inStock: "అందుబాటులో ఉంది",
    farmAI: "ఫార్మ్‌ఏఐ",
    twin: "డిజిటల్ ట్విన్",
    admin: "కమాండ్ సెంటర్",
    waste: "వ్యర్థ డెస్క్",
    ask: "ఫార్మ్‌ఏఐని అడగండి",
    voice: "వాయిస్‌తో అడగండి",
    upload: "పంట ఫోటో అప్‌లోడ్",
    demo: "నిజమైన వ్యవసాయ విజ్ఞానం మరియు ధరలు",
  },
  kn: {
    brandName: "ಸಮೃದ್ಧಿ ಸೇತು",
    pillBadge: "ರೈತ · ನೇರ · ನ್ಯಾಯಸಮ್ಮತ",
    heroQuote: "ಭಾರತದ ಕೃಷಿ ಸಮೃದ್ಧಿಯನ್ನು ನೇರವಾಗಿ ನಿಮ್ಮ ಮನೆಗೆ ತಲುಪಿಸುವ ಸೇತು — ತಾಜಾ, ಶುದ್ಧ ಮತ್ತು ನ್ಯಾಯಯುತ.",
    tagline: "ಹೊಲದಿಂದ ತಟ್ಟೆಗೆ · ತಾಜಾ ಮತ್ತು ನ್ಯಾಯಯುತ",
    motto: "ರೈತರು, ಗ್ರಾಹಕರು ಮತ್ತು ಸಾರಿಗೆಯನ್ನು ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸುವುದು",
    home: "ಮುಖಪುಟ",
    about: "ನಮ್ಮ ಬಗ್ಗೆ",
    shop: "ಮಾರುಕಟ್ಟೆ",
    services: "ಸೇವೆಗಳು",
    farmer: "ರೈತ",
    logistics: "ಸಾರಿಗೆ / ಲಾಜಿಸ್ಟಿಕ್ಸ್",
    map: "ಕೃಷಿ ನಕ್ಷೆ",
    cart: "ಬುಟ್ಟಿ",
    signIn: "ಲಾಗಿನ್",
    signUp: "ಸೇರ್ಪಡೆಗೊಳ್ಳಿ",
    exploreShop: "ಉತ್ಪನ್ನಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    joinFamily: "ನಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಸೇರಿ",
    farmerPortal: "ರೈತ ಪೋರ್ಟಲ್",
    logisticsPortal: "ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಪೋರ್ಟಲ್",
    registerFarmer: "ರೈತರ ನೋಂದಣಿ",
    registerConsumer: "ಗ್ರಾಹಕರ ನೋಂದಣಿ",
    registerLogistics: "ಡೆಲಿವರಿ ಪಾಲುದಾರ ನೋಂದಣಿ",
    aiScanner: "AI ಬೆಳೆ ಗುಣಮಟ್ಟ ಸ್ಕ್ಯಾನರ್",
    voiceAssistant: "ರೈತ ಧ್ವನಿ ಸಹಾಯಕ",
    mandiPrice: "ಮಂಡಿ ದರ",
    proceedToDelivery: "ವಿತರಣೆಗೆ ಮುಂದುವರಿಯಿರಿ",
    allCategories: "ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳು",
    searchPlaceholder: "ಬೆಳೆಗಳು, ತರಕಾರಿಗಳು, ಹಣ್ಣುಗಳು ಹುಡುಕಿ...",
    inStock: "ಲಭ್ಯವಿದೆ",
    farmAI: "ಫಾರ್ಮ್‌ಎಐ",
    twin: "ಡಿಜಿಟಲ್ ಟ್ವಿನ್",
    admin: "ಕಮಾಂಡ್ ಸೆಂಟರ್",
    waste: "ತ್ಯಾಜ್ಯ ಡೆಸ್ಕ್",
    ask: "ಫಾರ್ಮ್‌ಎಐಗೆ ಕೇಳಿ",
    voice: "ಧ್ವನಿ ಮೂಲಕ ಕೇಳಿ",
    upload: "ಬೆಳೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್",
    demo: "ನೈಜ ಕೃಷಿ ಮಾಹಿತಿ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರಗಳು",
  },
};

interface I18n {
  lang: AppLang;
  setLang: (l: AppLang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(
    () => (localStorage.getItem("f2f-lang") as AppLang) || "en"
  );

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        localStorage.setItem("f2f-lang", l);
      },
      t: (key) => dict[lang]?.[key] || dict.en[key] || key,
    }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
