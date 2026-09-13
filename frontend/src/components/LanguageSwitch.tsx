import { useI18n, SUPPORTED_LANGUAGES, type AppLang } from "../i18n";
import { Globe } from "lucide-react";

export function LanguageSwitch({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold border transition shadow-sm ${
        light
          ? "bg-white/15 text-white border-white/30 backdrop-blur-md hover:bg-white/25"
          : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <Globe className={`h-3.5 w-3.5 shrink-0 ${light ? "text-amber-300" : "text-[#2d6a4f]"}`} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AppLang)}
        className="cursor-pointer bg-transparent font-bold outline-none text-xs"
        aria-label="Language"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-zinc-900 bg-white">
            {l.native} ({l.code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
