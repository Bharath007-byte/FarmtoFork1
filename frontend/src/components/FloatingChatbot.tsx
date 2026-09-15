import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Link } from "react-router-dom";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  chips?: string[];
  link?: { text: string; url: string };
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome-1",
    sender: "bot",
    text: "Namaste! 🙏 I am your **Samruddhi Setu AI Assistant** (समृद्धि सेतु सहायक).\n\nHow can I help you today? You can ask me about fresh farm produce, order tracking, farmer registration, mandi rates, or our logistics network.",
    time: "Just now",
    chips: [
      "🚚 Track Order",
      "🌾 Mandi Rates",
      "🥩 Poultry & Meat",
      "🧑‍🌾 Join as Farmer",
      "🏛️ Govt Schemes",
    ],
  },
];

function generateResponse(query: string): { text: string; link?: { text: string; url: string }; chips?: string[] } {
  const q = query.toLowerCase();

  if (q.includes("track") || q.includes("where is my order") || q.includes("status")) {
    return {
      text: "You can track your live shipments in real time with our APMC delivery tracker! Orders under 30 kg are dispatched via express two-wheeler couriers, while bulk shipments (≥ 30 kg) move via heavy container trucks.",
      link: { text: "Go to Live Order Tracking", url: "/orders" },
      chips: ["Logistics Info", "Farmer Support", "Back to Menu"],
    };
  }

  if (q.includes("poultry") || q.includes("meat") || q.includes("chicken") || q.includes("egg") || q.includes("mutton") || q.includes("fish")) {
    return {
      text: "We just launched our new **Poultry, Meat & Fish** category! You can now buy fresh farm Desi eggs, antibiotic-free country chicken, grass-fed goat mutton, and fresh river Rohu fish directly from verified pastoral farmers.",
      link: { text: "Browse Poultry & Meat", url: "/marketplace" },
      chips: ["View Marketplace", "Organic Produce", "Track Order"],
    };
  }

  if (q.includes("mandi") || q.includes("price") || q.includes("rate") || q.includes("forecast")) {
    return {
      text: "Samruddhi Setu provides AI-driven Mandi Price Forecasting based on APMC market arrival patterns, regional weather indices, and direct farm gate sales in Andhra Pradesh and Karnataka.",
      link: { text: "Open Mandi Predictions", url: "/farmer/predictions" },
      chips: ["Vegetable Prices", "Fruit Prices", "Govt Schemes"],
    };
  }

  if (q.includes("farmer") || q.includes("sell") || q.includes("register") || q.includes("join")) {
    return {
      text: "Farmers can register with zero middlemen fees! Once verified with your Aadhaar and land record, you can list produce, join local cooperative societies (Kadapa, Devanahalli, Tirupati), and access Krishi AI Doctor.",
      link: { text: "Register as a Farmer", url: "/farmer/register" },
      chips: ["Community Support", "Krishi AI Doctor", "Mandi Rates"],
    };
  }

  if (q.includes("govt") || q.includes("scheme") || q.includes("subsidy") || q.includes("pm-kisan") || q.includes("pmfby")) {
    return {
      text: "Top active government initiatives for farmers:\n• **PM-KISAN**: ₹6,000/year direct bank transfer.\n• **PM Fasal Bima Yojana (PMFBY)**: Comprehensive crop insurance at 1.5-2% premium.\n• **Soil Health Card Scheme**: Scientific crop nutrient guidance.\n• **e-NAM**: National Agriculture Market linking 1,000+ mandis.",
      link: { text: "View Insights & Advisory", url: "/farmer/advisory" },
      chips: ["Krishi AI Doctor", "Join as Farmer", "Track Order"],
    };
  }

  if (q.includes("krishi") || q.includes("doctor") || q.includes("disease") || q.includes("pest")) {
    return {
      text: "Our **Krishi AI Doctor** uses computer vision to diagnose foliar leaf blights, powdery mildew, and nutrient deficiencies. Simply snap a picture of your crop leaf for instant treatment recommendations.",
      link: { text: "Launch Krishi AI Doctor", url: "/farmer/ai-studio" },
      chips: ["Mandi Rates", "Govt Schemes", "Order Produce"],
    };
  }

  if (q.includes("logistics") || q.includes("fleet") || q.includes("vehicle") || q.includes("truck") || q.includes("bike")) {
    return {
      text: "Our logistics dispatch algorithm intelligently categorizes cargo:\n• **< 30 kg**: Express Two-Wheeler (Bike / Scooter) for fast local deliveries.\n• **≥ 30 kg**: Heavy Commercial Trucks & Container vehicles for bulk cooperative freight.\nDrivers can also upload delivery proof photos directly in the portal.",
      link: { text: "Open Logistics Portal", url: "/logistics" },
      chips: ["Track Order", "Farmer Support", "View Marketplace"],
    };
  }

  if (q.includes("telugu") || q.includes("తెలుగు")) {
    return {
      text: "నమస్కారం! సమృద్ధి సేతు ద్వారా మీరు రైతుల నుండి నేరుగా తాజా కూరగాయలు, పండ్లు, నాటుకోడి గుడ్లు మరియు ధాన్యాలు సరసమైన ధరలకే పొందవచ్చు. మీకు ఏ సమాచారం కావాలి?",
      chips: ["ఆర్డర్ ట్రాక్ చేయండి", "మండి ధరలు", "రైతు నమోదు"],
    };
  }

  if (q.includes("hindi") || q.includes("हिंदी")) {
    return {
      text: "नमस्ते! समृद्धि सेतु में आपका स्वागत है। यहाँ आप सीधे किसानों से ताज़ा सब्जियाँ, फल, अनाज और पोल्ट्री उत्पाद खरीद सकते हैं। मैं आपकी क्या सहायता कर सकता हूँ?",
      chips: ["ऑर्डर ट्रैक करें", "मंडी भाव", "किसान पंजीकरण"],
    };
  }

  if (q.includes("kannada") || q.includes("ಕನ್ನಡ")) {
    return {
      text: "ನಮಸ್ಕಾರ! ಸಮೃದ್ಧಿ ಸೇತುಗೆ ಸುಸ್ವಾಗತ. ರೈತರಿಂದ ನೇರವಾಗಿ ತಾಜಾ ತರಕಾರಿಗಳು, ಹಣ್ಣುಗಳು ಮತ್ತು ಧಾನ್ಯಗಳನ್ನು ಖರೀದಿಸಿ. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
      chips: ["ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "ಮಂಡಿ ದರಗಳು", "ರೈತರ ನೋಂದಣಿ"],
    };
  }

  return {
    text: "Thank you for reaching out! Samruddhi Setu connects verified farmers directly with consumers and cooperative societies with 100% price transparency and zero commission leakage.",
    chips: ["Track Order", "Mandi Rates", "Poultry & Meat", "Govt Schemes"],
  };
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const resp = generateResponse(q);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: resp.text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        chips: resp.chips,
        link: resp.link,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleChipClick = (chip: string) => {
    const clean = chip.replace(/^[^\w\s]+/, "").trim();
    handleSend(clean);
  };

  return (
    <>
      {/* Floating Trigger Button on Bottom-Right */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open Samruddhi Setu Assistant"
          className="fixed bottom-5 right-5 z-50 group flex items-center gap-2.5 bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-emerald-900/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/30"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
            <Bot size={20} className="text-amber-200 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none">Samruddhi AI</span>
            <span className="text-[9px] text-amber-200/90 font-medium">Assistant</span>
          </div>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            isMinimized
              ? "bottom-5 h-16"
              : "bottom-5 h-[560px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between shadow-xs select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
                <Bot size={18} className="text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Samruddhi AI</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-400/20 text-amber-200 rounded border border-amber-300/30 uppercase">
                    Sahayak
                  </span>
                </h4>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online · Direct Farmer Support</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
                {messages.map((m) => {
                  const isBot = m.sender === "bot";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                          isBot
                            ? "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                            : "bg-[#1b4332] text-white rounded-tr-xs"
                        }`}
                      >
                        <div className="whitespace-pre-line">{m.text}</div>

                        {m.link && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100">
                            <Link
                              to={m.link.url}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-500/40 underline-offset-2"
                            >
                              <span>{m.link.text}</span>
                              <span>→</span>
                            </Link>
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>

                      {/* Suggestion Chips */}
                      {isBot && m.chips && m.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.chips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => handleChipClick(chip)}
                              className="text-[10px] font-semibold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-full px-2.5 py-1 transition shadow-2xs"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 w-fit shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.3s]" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask in English, తెలుగు, हिंदी..."
                  className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-emerald-600 focus:outline-hidden transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white hover:opacity-95 disabled:opacity-40 transition shadow-xs flex items-center justify-center shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
