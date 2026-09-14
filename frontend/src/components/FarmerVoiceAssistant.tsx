import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, X } from "lucide-react";
import { useI18n, type AppLang } from "../i18n";

interface Message {
  sender: "user" | "bot";
  text: string;
  lang: AppLang;
  timestamp: string;
}

const QUICK_PROMPTS: Record<AppLang, { label: string; query: string }[]> = {
  en: [
    { label: "🍅 Tomato Mandi Price", query: "What is today's tomato mandi price?" },
    { label: "🧅 Onion & Potato Rate", query: "What are the current onion and potato rates?" },
    { label: "⭐ How to get Grade A?", query: "How can I grade my produce as Grade A to get higher price?" },
    { label: "🏢 Cooperative Societies", query: "Tell me about cooperative societies in Devanahalli and Yelahanka" },
    { label: "🌦️ Weather & Soil Care", query: "Give me weather and harvest guidance for this week" },
  ],
  hi: [
    { label: "🍅 टमाटर का मंडी भाव", query: "आज टमाटर का मंडी भाव क्या है?" },
    { label: "🧅 प्याज और आलू के भाव", query: "आज प्याज और आलू के मंडी भाव क्या हैं?" },
    { label: "⭐ ग्रेड A क्वालिटी कैसे पाएं?", query: "मेरी फसल को ग्रेड A गुणवत्ता और बेहतर भाव कैसे मिलेगा?" },
    { label: "🏢 देवनहल्ली व येलहंका सोसाइटी", query: "देवनहल्ली और येलहंका की सहकारी समितियों के बारे में बताएं" },
    { label: "🌦️ मौसम और फसल सलाह", query: "इस सप्ताह मौसम और कटाई से जुड़ी सलाह दें" },
  ],
  te: [
    { label: "🍅 టమోటా మార్కెట్ ధర", query: "ఈరోజు టమోటా మార్కెట్ ధర ఎంత?" },
    { label: "🧅 ఉల్లిపాయ మరియు బంగాళాదుంప రేటు", query: "ఈరోజు ఉల్లిపాయ, బంగాళాదుంప రేట్లు ఎంత?" },
    { label: "⭐ గ్రేడ్ A నాణ్యత ఎలా సాధించాలి?", query: "నా పంటకు గ్రేడ్ A నాణ్యత మరియు మంచి ధర ఎలా పొందాలి?" },
    { label: "🏢 తిరుపతి మరియు సహకార సంఘాలు", query: "తిరుపతి రైతు మిత్ర సహకార సంఘం వివరాలు చెప్పండి" },
    { label: "🌦️ వాతావరణం మరియు సలహాలు", query: "ఈ వారం వాతావరణం మరియు కోత సలహాలు ఇవ్వండి" },
  ],
  kn: [
    { label: "🍅 ಟೊಮೆಟೊ ಮಂಡಿ ದರ", query: "ಇಂದು ಟೊಮೆಟೊ ಮಂಡಿ ದರ ಎಷ್ಟು?" },
    { label: "🧅 ಈರುಳ್ಳಿ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ದರ", query: "ಇಂದು ಈರುಳ್ಳಿ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ಮಂಡಿ ದರ ಎಷ್ಟು?" },
    { label: "⭐ ಗ್ರೇಡ್ A ಪಡೆಯುವುದು ಹೇಗೆ?", query: "ಉತ್ತಮ ಬೆಲೆಗೆ ಗ್ರೇಡ್ A ಬೆಳೆ ಗುಣಮಟ್ಟ ಹೇಗೆ ಪಡೆಯುವುದು?" },
    { label: "🏢 ದೇವನಹಳ್ಳಿ ಮತ್ತು ಯಲಹಂಕ ಸೊಸೈಟಿ", query: "ದೇವನಹಳ್ಳಿ ಮತ್ತು ಯಲಹಂಕ ರೈತ ಸಹಕಾರ ಸಂಘಗಳ ಮಾಹಿತಿ ನೀಡಿ" },
    { label: "🌦️ ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಸಲಹೆ", query: "ಈ ವಾರದ ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ರಕ್ಷಣೆ ಸಲಹೆ ಕೊಡಿ" },
  ],
};

const KNOWLEDGE_RESPONSES: Record<AppLang, { pattern: RegExp; response: string }[]> = {
  en: [
    {
      pattern: /tomato|tamatar/i,
      response: "Today's APMC Mandi benchmark for Tomato (Hybrid Vaishnavi) is ₹32 to ₹38 per kg. Grade A produce is fetching up to ₹42/kg at local cooperative collection centers.",
    },
    {
      pattern: /onion|potato|pyaz|aaloo/i,
      response: "Nashik Red Onion is trading at ₹28 to ₹34/kg. Jyoti Potato modal rate is ₹22 to ₹26/kg across Bengaluru and Chittoor rural markets.",
    },
    {
      pattern: /grade|quality|score/i,
      response: "To get Grade A: Ensure 85%+ uniform color, zero surface punctures, clean dry skin, and size sorting. Grade A crops qualify for guaranteed 20% price premium on Samruddhi Setu.",
    },
    {
      pattern: /society|cooperative|devanahalli|yelahanka|tirupati/i,
      response: "We have 3 active verified hubs: 1) Devanahalli Farmers Cooperative (SOC-DEV-001) for vegetables, 2) Yelahanka Federation (SOC-YEL-002) for peri-urban express drops, and 3) Tirupati Rythu Mitra (SOC-TIR-003) for fruit and grain bulk pickups.",
    },
    {
      pattern: /weather|rain|water|soil/i,
      response: "Current regional forecast: Mild sunshine, temperature 28°C-31°C with low humidity. Ideal time for vegetable harvest before evening dew. Irrigate early morning with drip lines.",
    },
  ],
  hi: [
    {
      pattern: /टमाटर|tomato|रेट|भाव/i,
      response: "आज टमाटर (हाइब्रिड वैष्णवी) का मंडी भाव ₹32 से ₹38 प्रति किलो है। समृद्ध सेतु पर ग्रेड A टमाटर को ₹42/किलो तक का सीधा भाव मिल रहा है।",
    },
    {
      pattern: /प्याज|आलू|onion|potato/i,
      response: "नासिक लाल प्याज का भाव ₹28 से ₹34/किग्रा और ज्योति आलू का थोक भाव ₹22 से ₹26/किग्रा चल रहा है।",
    },
    {
      pattern: /ग्रेड|क्वालिटी|गुणवत्ता|grade/i,
      response: "ग्रेड A पाने के लिए: फसल का रंग 85%+ एकसमान रखें, दाग-धब्बे रहित फल चुनें और कटाई के बाद सुखाकर पैक करें। ग्रेड A पर 20% अधिक मूल्य मिलता है।",
    },
    {
      pattern: /समिति|सोसाइटी|देवनहल्ली|येलहंका|तिरुपति|society/i,
      response: "हमारे तीन प्रमुख केंद्र सक्रिय हैं: 1. देवनहल्ली किसान सहकारी समिति (SOC-DEV-001), 2. येलहंका फेडरेशन (SOC-YEL-002) और 3. तिरुपति रायथु मित्र संघ (SOC-TIR-003)। यहां से लॉजिस्टिक्स ट्रक सीधे माल उठाते हैं।",
    },
    {
      pattern: /मौसम|बारिश|weather|पानी/i,
      response: "इस सप्ताह मौसम शुष्क और धूप वाला रहेगा (28°C-31°C)। कटाई और पैकिंग के लिए मौसम बिल्कुल अनुकूल है। सुबह के समय ड्रिप से सिंचाई करें।",
    },
  ],
  te: [
    {
      pattern: /టమోటా|ధర|రేటు|tomato/i,
      response: "ఈరోజు టమోటా మార్కెట్ బెంచ్మార్క్ ధర కిలోకు ₹32 నుండి ₹38 ఉంది. సమృద్ధి సేతులో గ్రేడ్ A టమోటాలకు ₹42 వరకు గిట్టుబాటు ధర లభిస్తోంది.",
    },
    {
      pattern: /ఉల్లి|బంగాళాదుంప|onion|potato/i,
      response: "ఎర్ర ఉల్లిపాయ ధర ₹28 - ₹34/కిలో, బంగాళాదుంప సగటు ధర ₹22 - ₹26/కిలోగా నమోదు చేయబడింది.",
    },
    {
      pattern: /గ్రేడ్|నాణ్యత|grade|quality/i,
      response: "గ్రేడ్ A పొందడానికి: పంట ఏకరీతి రంగు కలిగి ఉండాలి, మచ్చలు లేకుండా ఉండాలి. గ్రేడ్ A పంటలకు సమృద్ధి సేతు ద్వారా 20% అదనపు ఆదాయం అందుతుంది.",
    },
    {
      pattern: /సొసైటీ|తిరుపతి|దేవనహళ్ళి|యలహంక|society/i,
      response: "మీ ప్రాంతంలో 3 ధృవీకరించబడిన కేంద్రాలు పనిచేస్తున్నాయి: తిరుపతి రైతు మిత్ర సొసైటీ (SOC-TIR-003), దేవనహళ్ళి (SOC-DEV-001), మరియు యలహంక (SOC-YEL-002). బల్క్ ఆర్డర్లను ఇక్కడి నుండి పంపవచ్చు.",
    },
    {
      pattern: /వాతావరణం|వర్షం|weather/i,
      response: "ఈ వారం వాతావరణం పొడిగా, ఎండగా (28°C-31°C) ఉంటుంది. కోత కోయడానికి మరియు ఎండబెట్టడానికి ఇది సరైన సమయం.",
    },
  ],
  kn: [
    {
      pattern: /ಟೊಮೆಟೊ|ದರ|ರೇಟ್|tomato/i,
      response: "ಇಂದು ಟೊಮೆಟೊ (ಹೈಬ್ರಿಡ್ ವೈಷ್ಣವಿ) ಮಂಡಿ ದರ ಪ್ರತಿ ಕೆಜಿಗೆ ₹32 ರಿಂದ ₹38 ಇದೆ. ಸಮೃದ್ಧಿ ಸೇತುವಿನಲ್ಲಿ ಗ್ರೇಡ್ A ಗುಣಮಟ್ಟಕ್ಕೆ ₹42 ವರೆಗೆ ನೇರ ಬೆಲೆ ಸಿಗುತ್ತಿದೆ.",
    },
    {
      pattern: /ಈರುಳ್ಳಿ|ಆಲೂಗಡ್ಡೆ|onion|potato/i,
      response: "ನಾಸಿಕ್ ಕೆಂಪು ಈರುಳ್ಳಿ ದರ ₹28 - ₹34/ಕೆಜಿ ಮತ್ತು ಆಲೂಗಡ್ಡೆ ಸರಾಸರಿ ದರ ₹22 - ₹26/ಕೆಜಿ ಇದೆ.",
    },
    {
      pattern: /ಗ್ರೇಡ್|ಗುಣಮಟ್ಟ|grade|quality/i,
      response: "ಗ್ರೇಡ್ A ಪಡೆಯಲು: 85% ಕ್ಕಿಂತ ಹೆಚ್ಚು ಏಕರೂಪ ಬಣ್ಣ, ಗಾಯವಿಲ್ಲದ ಮೇಲ್ಮೈ ಇರಬೇಕು. ಗ್ರೇಡ್ A ಬೆಳೆಗೆ 20% ಅಧಿಕ ಪ್ರೀಮಿಯಂ ಲಾಭ ದೊರೆಯುತ್ತದೆ.",
    },
    {
      pattern: /ಸೊಸೈಟಿ|ದೇವನಹಳ್ಳಿ|ಯಲಹಂಕ|ತಿರುಪತಿ|society/i,
      response: "ನಮ್ಮ 3 ಅಧಿಕೃತ ಸಹಕಾರ ಸಂಘಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ: ದೇವನಹಳ್ಳಿ ರೈತರ ಸಹಕಾರ ಸಂಘ (SOC-DEV-001), ಯಲಹಂಕ ಒಕ್ಕೂಟ (SOC-YEL-002) ಮತ್ತು ತಿರುಪತಿ ರೈತ ಮಿತ್ರ (SOC-TIR-003).",
    },
    {
      pattern: /ಹವಾಮಾನ|ಮಳೆ|weather/i,
      response: "ಪ್ರಸ್ತುತ ಹವಾಮಾನ: ತಿಳಿ ಬಿಸಿಲು (28°C - 31°C). ಬೆಳೆ ಕಟಾವಿಗೆ ಮತ್ತು ಸಾಗಾಣಿಕೆಗೆ ಅತ್ಯಂತ ಸೂಕ್ತವಾದ ಸಮಯವಾಗಿದೆ.",
    },
  ],
};

const SPEECH_LANG_CODES: Record<AppLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
};

interface Props {
  embedded?: boolean;
  initialMode?: "small" | "medium";
}

export function FarmerVoiceAssistant({ embedded = false, initialMode = "medium" }: Props) {
  const { lang, setLang, t } = useI18n();
  const [isOpen, setIsOpen] = useState(embedded);
  const [mode, setMode] = useState<"small" | "medium">(initialMode);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Initial welcome message per language
  useEffect(() => {
    const welcomes: Record<AppLang, string> = {
      en: "Namaste Kisan! I am your Samruddhi Setu Voice Assistant. Ask me about Mandi prices, crop grading, weather, or cooperative society orders in your language.",
      hi: "नमस्ते किसान भाई! मैं समृद्धि सेतु का वॉइस असिस्टेंट हूँ। आप मुझसे मंडी भाव, फसल ग्रेडिंग, मौसम या नजदीकी सहकारी समितियों के बारे में पूछ सकते हैं।",
      te: "నమస్తే రైతు సోదరులారా! నేను సమృద్ధి సేతు వాయిస్ అసిస్టెంట్. మీరు మార్కెట్ ధరలు, పంట నాణ్యత గ్రేడింగ్ లేదా సొసైటీ వివరాలను అడగవచ్చు.",
      kn: "ನಮಸ್ಕಾರ ರೈತ ಬಾಂಧವರೇ! ನಾನು ನಿಮ್ಮ ಸಮೃದ್ಧಿ ಸೇತು ಧ್ವನಿ ಸಹಾಯಕ. ಮಂಡಿ ದರಗಳು, ಬೆಳೆ ಗ್ರೇಡಿಂಗ್ ಮತ್ತು ಸೊಸೈಟಿ ಮಾಹಿತಿಗಳನ್ನು ನನ್ನ ಬಳಿ ಕೇಳಬಹುದು.",
    };

    setMessages([
      {
        sender: "bot",
        text: welcomes[lang] || welcomes.en,
        lang,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [lang]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech Synthesis Helper
  const speakText = useCallback(
    (text: string, currentLang: AppLang) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG_CODES[currentLang] || "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const targetLangPrefix = currentLang === "en" ? "en" : currentLang;
      const matchedVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith(targetLangPrefix) || v.lang.includes(SPEECH_LANG_CODES[currentLang])
      );
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voices]
  );

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Generate answer based on multilingual knowledge base
  const handleQuery = (query: string) => {
    if (!query.trim()) return;

    const userMsg: Message = {
      sender: "user",
      text: query,
      lang,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    const langRules = KNOWLEDGE_RESPONSES[lang] || KNOWLEDGE_RESPONSES.en;
    const match = langRules.find((r) => r.pattern.test(query));

    let botResponse = "";
    if (match) {
      botResponse = match.response;
    } else {
      const fallbackAnswers: Record<AppLang, string> = {
        en: `Regarding "${query}": Mandi prices in Devanahalli and Yelahanka are active. High quality Grade A produce is fetching premium direct rates on Samruddhi Setu. Check the AI Produce Scanner to get exact grade score and suggested price!`,
        hi: `"${query}" के संबंध में: देवनहल्ली और नजदीकी मंडियों में सक्रिय खरीद चल रही है। ग्रेड A फसल पर सीधे अधिक दर मिल रही है। सटीक ग्रेडिंग और अनुमानित मूल्य जानने के लिए हमारे एआई स्कैनर का उपयोग करें!`,
        te: `"${query}" పై సమాచారం: స్థానిక మార్కెట్లలో ధరలు స్థిరంగా ఉన్నాయి. గ్రేడ్ A నాణ్యత ఉన్న పంటలకు సమృద్ధి సేతులో గరిష్ట ధర లభిస్తుంది. కచ్చితమైన వివరాలకు AI స్కానర్ ఉపయోగించండి!`,
        kn: `"${query}" ಬಗ್ಗೆ ಮಾಹಿತಿ: ಸ್ಥಳೀಯ ಮಂಡಿಗಳಲ್ಲಿ ವಹಿವಾಟು ಚುರುಕಾಗಿದೆ. ಗ್ರೇಡ್ A ಬೆಳೆಗೆ ಉತ್ತಮ ಬೆಲೆ ದೊರೆಯುತ್ತಿದೆ. ನಿಖರ ಬೆಲೆ ತಿಳಿಯಲು ಎಐ ಸ್ಕ್ಯಾನರ್ ಬಳಸಿ!`,
      };
      botResponse = fallbackAnswers[lang] || fallbackAnswers.en;
    }

    setTimeout(() => {
      const botMsg: Message = {
        sender: "bot",
        text: botResponse,
        lang,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      speakText(botResponse, lang);
    }, 400);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please type your query in the box below.");
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRec();
    recognition.lang = SPEECH_LANG_CODES[lang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        handleQuery(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const quickPills = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en;

  if (embedded) {
    if (mode === "small") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition ${
                isListening ? "animate-pulse bg-emerald-700" : "bg-[#1b4332] hover:bg-[#245e38]"
              }`}
              title={isListening ? "Listening... click to stop" : "Click to speak"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-zinc-900">Kisan Voice Sahayak</p>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 uppercase">
                  {lang}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {isListening ? "Listening now... speak in your native language" : "Tap microphone to ask mandi rates or crop advice"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-200"
              >
                <VolumeX className="h-3 w-3" />
                Mute
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode("medium")}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
            >
              Medium View
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm">
        {/* Assistant Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-[#f4f7f4] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b4332] text-white shadow-sm">
              <Mic className="h-5 w-5" />
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-zinc-900">{t("voiceAssistant")}</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Live Voice
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Tap microphone and speak in Hindi, Telugu, Kannada, or English
              </p>
            </div>
          </div>

          {/* Assistant Actions */}
          <div className="flex items-center gap-2">
            {/* Size mode selector */}
            <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 text-[11px] font-bold text-zinc-600">
              <button
                type="button"
                onClick={() => setMode("small")}
                className="rounded-lg px-2 py-0.5 transition hover:text-zinc-900"
              >
                Small
              </button>
              <button
                type="button"
                onClick={() => setMode("medium")}
                className="rounded-lg px-2 py-0.5 transition bg-zinc-200 text-zinc-900 shadow-xs"
              >
                Medium
              </button>
            </div>

            <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 text-xs font-semibold">
              {(["en", "hi", "te", "kn"] as AppLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-lg px-2 py-1 uppercase transition ${
                    lang === l ? "bg-[#2f7a4a] text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                title="Stop Audio"
                className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200"
              >
                <VolumeX className="h-3.5 w-3.5" />
                Mute
              </button>
            )}
          </div>
        </div>

        {/* Chat Stream */}
        <div className="h-64 overflow-y-auto space-y-3.5 p-5 bg-[#faf9f6]/50">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                  m.sender === "user"
                    ? "bg-[#2f7a4a] text-white rounded-br-xs"
                    : "bg-white text-zinc-800 border border-zinc-200/80 rounded-bl-xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] opacity-75">
                  <span>{m.timestamp}</span>
                  {m.sender === "bot" && (
                    <button
                      type="button"
                      onClick={() => speakText(m.text, m.lang)}
                      className="hover:underline flex items-center gap-1"
                    >
                      <Volume2 className="h-3 w-3" />
                      Listen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggested Prompts */}
        <div className="border-t border-zinc-100 bg-white px-5 py-2.5">
          <p className="mb-2 text-[11px] font-bold tracking-wider uppercase text-zinc-400">
            Quick Queries ({lang.toUpperCase()}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPills.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuery(qp.query)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 hover:border-[#2f7a4a] hover:bg-[#e8f0e3] hover:text-[#2f7a4a] transition"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Speak Bar */}
        <div className="border-t border-zinc-100 bg-white p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuery(inputText);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition ${
                isListening
                  ? "animate-pulse bg-rose-600 text-white"
                  : "bg-[#2f7a4a] text-white hover:bg-[#26633c]"
              }`}
              title={isListening ? "Listening... click to stop" : "Click to speak"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask in ${lang.toUpperCase()} or click mic to speak...`}
              className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-[#2f7a4a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2f7a4a]"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1c2b22] text-white disabled:opacity-30 hover:bg-black transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Floating trigger button + drawer
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#1b4332] px-4 py-3 text-white shadow-2xl hover:bg-[#245e38] transition-transform hover:scale-105 active:scale-95"
      >
        <div className="relative">
          <Mic className="h-5 w-5" />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide">Kisan Voice Sahayak</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-[#f4f7f4] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b4332] text-white">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-zinc-900">
                    {t("voiceAssistant")}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Samruddhi Setu Kisan Sahayak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FarmerVoiceAssistant embedded={true} />
          </div>
        </div>
      )}
    </>
  );
}
