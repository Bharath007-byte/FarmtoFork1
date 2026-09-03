import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { useApp } from "../context/AppState";
import { useI18n } from "../i18n";
import { detectFromImageSignals } from "../ai/engine";

export function FarmAI() {
  const { t } = useI18n();
  const { user, locationLabel } = useApp();
  const [cropHint, setCropHint] = useState(user?.crops?.[0] || "Tomato Large");
  const [question, setQuestion] = useState("");
  const [photo, setPhoto] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [result, setResult] = useState<ReturnType<typeof detectFromImageSignals> | null>(null);
  const [chat, setChat] = useState("");

  const onFile = (file?: File) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 40, 40);
      const data = ctx.getImageData(0, 0, 40, 40).data;
      let r = 0, g = 0, b = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      r /= n;
      g /= n;
      b /= n;
      const brightness = (r + g + b) / 3;
      setResult(
        detectFromImageSignals({
          cropHint,
          avgGreen: g,
          avgRed: r,
          brightness,
        })
      );
      URL.revokeObjectURL(url);
    };
    img.src = url;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const listen = () => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((ev: { results: Array<Array<{ transcript: string }>> }) => void) | null;
      };
    };
    const Ctor = w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceNote("Voice needs Chrome/Safari speech recognition on this device.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript || "";
      setQuestion(text);
      setVoiceNote(text);
    };
    rec.start();
  };

  const answer = useMemo(() => {
    const q = (question || voiceNote).toLowerCase();
    if (!q && !result) return "";
    if (q.includes("price") || q.includes("rate"))
      return `Near ${locationLabel || "your pin"}, keep farm-gate within 5% of the buy sheet. This is an AI Prediction, not a mandi guarantee.`;
    if (q.includes("water") || q.includes("irrig"))
      return "If drip is on, cut 10–15% if leaf is dark and soil is cool at 8am. Estimated from season heuristics.";
    if (result)
      return `${result.crop}: ${result.health}. ${result.action}`;
    return "Ask about disease, irrigation, or price — or upload a leaf photo. Answers are model/heuristic, not certified agronomy.";
  }, [question, voiceNote, result, locationLabel]);

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-28">
        <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#2f7a4a]">
          ← Dashboard
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          {t("farmAI")} 🌱
        </p>
        <h1 className="mt-2 font-serif text-4xl">Farmer assistant</h1>
        <p className="mt-2 text-sm text-zinc-500">{t("demo")}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <label className="cursor-pointer rounded-2xl bg-white p-4 text-center text-sm font-semibold shadow-sm">
            📷 {t("upload")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={listen}
            className="rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm"
          >
            🎤 {t("voice")}
          </button>
          <button
            type="button"
            onClick={() => setChat(answer || "Upload a photo or type a question first.")}
            className="rounded-2xl bg-[#2f7a4a] p-4 text-sm font-semibold text-white"
          >
            💬 {t("ask")}
          </button>
        </div>

        <input
          value={cropHint}
          onChange={(e) => setCropHint(e.target.value)}
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm"
          placeholder="Crop name"
        />
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm"
          placeholder="Symptoms, irrigation, price…"
        />
        {voiceNote && <p className="mt-2 text-xs text-zinc-500">Voice: {voiceNote}</p>}

        {photo && (
          <img src={photo} alt="" className="mt-4 h-40 w-full rounded-2xl object-cover" />
        )}

        {result && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <DataBadge origin={result.origin} />
            <p className="mt-3 text-sm">Crop detected: <b>{result.crop}</b></p>
            <p className="text-sm">Health: {result.health}</p>
            <p className="text-sm">Possible disease: {result.disease}</p>
            <p className="text-sm">Confidence: {Math.round(result.confidence * 100)}%</p>
            <p className="mt-3 text-sm leading-relaxed">{result.action}</p>
            <p className="mt-2 text-sm text-zinc-500">{result.preventive}</p>
          </div>
        )}

        {(chat || answer) && (
          <div className="mt-4 rounded-3xl bg-[#e8f0e3] p-5 text-sm leading-relaxed">
            {chat || answer}
          </div>
        )}
      </div>
    </div>
  );
}
