export function SamruddhiSetuLogo({
  light = false,
  size = "md",
  className = "",
}: {
  light?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isSm = size === "sm";
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Handcrafted Emblem: Bridge + Flourishing Sprout */}
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] shadow-md ring-1 ring-white/20 ${
          isSm ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-[#e8b84a]"
        >
          {/* Bridge Arch (Setu) */}
          <path
            d="M 6 30 C 14 18, 26 18, 34 30"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Bridge Piers */}
          <path d="M 12 24 L 12 31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M 20 21 L 20 31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 28 24 L 28 31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          {/* Golden Prosperity Sprout / Sheaves (Samruddhi) */}
          <path
            d="M 20 8 C 22 14, 25 16, 28 17 C 24 18, 21 16, 20 12"
            fill="#52b788"
          />
          <path
            d="M 20 8 C 18 14, 15 16, 12 17 C 16 18, 19 16, 20 12"
            fill="#74c69d"
          />
          <circle cx="20" cy="7" r="2.5" fill="#f4a261" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-serif text-lg font-bold tracking-tight leading-none ${
            light ? "text-white" : "text-zinc-900"
          }`}
        >
          Samruddhi Setu
        </span>
        <span
          className={`text-[9px] font-semibold tracking-wider uppercase ${
            light ? "text-amber-200/90" : "text-[#2d6a4f]"
          }`}
        >
          समृद्धि सेतु · Farmer Direct
        </span>
      </div>
    </div>
  );
}
