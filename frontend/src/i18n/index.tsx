import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppLang = "en" | "hi" | "te";

const dict: Record<AppLang, Record<string, string>> = {
  en: {
    farmAI: "FarmAI",
    twin: "Digital twin",
    admin: "Command center",
    map: "Ag map",
    waste: "Waste desk",
    ask: "Ask FarmAI",
    voice: "Ask by voice",
    upload: "Upload crop image",
    demo: "Simulated / model output — not a guaranteed fact.",
  },
  hi: {
    farmAI: "फार्मएआई",
    twin: "डिजिटल ट्विन",
    admin: "कमांड सेंटर",
    map: "कृषि मानचित्र",
    waste: "अपव्यय डेस्क",
    ask: "फार्मएआई से पूछें",
    voice: "आवाज़ से पूछें",
    upload: "फ़सल की तस्वीर",
    demo: "अनुमान / मॉडल — यह गारंटी नहीं है।",
  },
  te: {
    farmAI: "ఫార్మ్‌ఏఐ",
    twin: "డిజిటల్ ట్విన్",
    admin: "కమాండ్ సెంటర్",
    map: "వ్యవసాయ పటం",
    waste: "వ్యర్థ డెస్క్",
    ask: "ఫార్మ్‌ఏఐని అడగండి",
    voice: "వాయిస్‌తో అడగండి",
    upload: "పంట ఫోటో",
    demo: "అంచనా / మోడల్ — హామీ కాదు.",
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
      t: (key) => dict[lang][key] || dict.en[key] || key,
    }),
    [lang]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n");
  return ctx;
}
