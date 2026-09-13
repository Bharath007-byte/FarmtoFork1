import { useState } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { useApp } from "../context/AppState";
import { useI18n } from "../i18n";
import { detectFromImageSignals } from "../ai/engine";
import { api } from "../services/api";
import {
  Camera,
  Mic,
  Send,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface AgriAssistantResponse {
  success: boolean;
  tag: string;
  crop: string;
  district: string;
  soil: string;
  answer: string;
  actionItem: string;
  confidenceScore: number;
  verifiedSource: string;
}

export function FarmAI() {
  const { t } = useI18n();
  const { user, locationLabel } = useApp();
  const [cropHint, setCropHint] = useState(user?.crops?.[0] || "Tomato");
  const [question, setQuestion] = useState("");
  const [photo, setPhoto] = useState("");
  const [voiceNote, setVoiceNote] = useState("");
  const [result, setResult] = useState<ReturnType<typeof detectFromImageSignals> | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<AgriAssistantResponse | null>(null);
  const [assistantError, setAssistantError] = useState("");

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
      setVoiceNote("Voice recognition requires Chrome or Edge browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript || "";
      setQuestion(text);
      setVoiceNote(text);
      // Automatically trigger assistant inquiry with voice transcript
      queryAssistant(text);
    };
    rec.start();
  };

  const queryAssistant = async (queryText?: string) => {
    const q = (queryText || question || voiceNote).trim();
    if (!q && !result) return;

    setAssistantLoading(true);
    setAssistantError("");
    try {
      const data = await api<AgriAssistantResponse>("/api/ai/agri-assistant", {
        method: "POST",
        body: JSON.stringify({
          query: q || `Health check for ${cropHint}`,
          crop: cropHint,
          district: locationLabel || "Bengaluru Rural",
          soil: "Red Sandy Loam",
        }),
      });
      setAssistantResponse(data);
    } catch (err: any) {
      console.error("Assistant error:", err);
      setAssistantError("Could not reach real-time agronomy assistant. Please check connection.");
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-28">
        <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#2f7a4a] hover:underline">
          ← Back to Farmer Dashboard
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          {t("farmAI")} 🌱
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-zinc-900">Grounded Farm AI Assistant</h1>
        <p className="mt-2 text-sm text-zinc-600">
          ICAR-verified crop health, pest diagnosis, irrigation scheduling, and APMC modal price intelligence.
        </p>

        {/* Action bar */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white p-4 text-center text-sm font-semibold text-zinc-800 shadow-sm border border-zinc-200 hover:border-emerald-500 transition">
            <Camera className="h-4 w-4 text-emerald-700" />
            <span>📷 {t("upload")} Leaf Photo</span>
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
            className="flex items-center justify-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold text-zinc-800 shadow-sm border border-zinc-200 hover:border-emerald-500 transition"
          >
            <Mic className="h-4 w-4 text-emerald-700" />
            <span>🎤 {t("voice")} Assistant</span>
          </button>
          <button
            type="button"
            disabled={assistantLoading}
            onClick={() => queryAssistant()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] p-4 text-sm font-semibold text-white shadow-sm hover:bg-[#26633c] disabled:opacity-50 transition"
          >
            {assistantLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{t("ask")} Advisory</span>
          </button>
        </div>

        {/* Crop Hint & Question Inputs */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Target Crop</label>
            <input
              value={cropHint}
              onChange={(e) => setCropHint(e.target.value)}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-zinc-200 focus:border-emerald-600 focus:outline-none shadow-sm"
              placeholder="Crop name (e.g. Tomato, Onion, Mango, Ragi)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Your Question or Symptom</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-zinc-200 focus:border-emerald-600 focus:outline-none shadow-sm"
              placeholder="Ask about blight symptoms, fertilizer dosing, drip irrigation intervals, or mandi price outlook…"
            />
          </div>
        </div>

        {voiceNote && (
          <p className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            Recorded voice: "{voiceNote}"
          </p>
        )}

        {photo && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2">
            <img src={photo} alt="Crop sample" className="h-48 w-full rounded-xl object-cover" />
          </div>
        )}

        {/* Image Signal / Color Spectrum Result */}
        {result && (
          <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <DataBadge origin={result.origin} />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-base font-bold text-zinc-900">
                Leaf Visual Scan: <span className="text-emerald-700">{result.crop}</span>
              </p>
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                {Math.round(result.confidence * 100)}% Confidence
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">Health Index: {result.health}</p>
            <p className="text-sm text-zinc-600">Observation: {result.disease}</p>
            <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-800 border border-zinc-200">
              <span className="font-bold text-emerald-800">Intervention: </span>
              {result.action}
            </div>
            <p className="mt-2 text-xs text-zinc-500">{result.preventive}</p>
          </div>
        )}

        {/* Real Grounded AI Advisory Output */}
        {assistantResponse && (
          <div className="mt-6 rounded-3xl border border-emerald-300 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                {assistantResponse.tag}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {assistantResponse.confidenceScore}% Agronomic Match
              </span>
            </div>

            <h3 className="mt-3 text-base font-bold text-zinc-900">
              {assistantResponse.crop} · {assistantResponse.district}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {assistantResponse.answer}
            </p>

            <div className="mt-4 rounded-2xl bg-[#e8f0e3] p-4 border border-emerald-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">Recommended Farm Action</p>
                  <p className="mt-0.5 text-xs text-emerald-900 leading-snug">{assistantResponse.actionItem}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
              <span>Source: {assistantResponse.verifiedSource}</span>
              <Link to="/farmer/advisory" className="font-semibold text-emerald-700 hover:underline">
                View Full Season Advisory →
              </Link>
            </div>
          </div>
        )}

        {assistantError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {assistantError}
          </div>
        )}
      </div>
    </div>
  );
}
