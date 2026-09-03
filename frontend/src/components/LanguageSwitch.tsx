import { useI18n, type AppLang } from "../i18n";

export function LanguageSwitch({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();
  const cls = light ? "text-white" : "text-[#1c2b22]";
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as AppLang)}
      className={`rounded-full bg-transparent px-2 py-1 text-[11px] font-semibold ${cls}`}
      aria-label="Language"
    >
      <option value="en">EN</option>
      <option value="hi">हि</option>
      <option value="te">తె</option>
    </select>
  );
}
