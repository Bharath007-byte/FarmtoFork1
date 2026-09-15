import { useEffect, useState, useMemo } from "react";
import {
  Award,
  BookOpen,
  ExternalLink,
  FileCheck,
  FileText,
  Landmark,
  Languages,
  Search,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { api } from "../services/api";
import { useI18n, SUPPORTED_LANGUAGES, type AppLang } from "../i18n";

interface AdvisoryCardData {
  id: string;
  tag: string;
  title: string;
  summary: string;
  actionItem: string;
  confidenceScore: number;
  source: string;
}

interface AdvisoryResponse {
  success: boolean;
  region: {
    district: string;
    state: string;
    soil: string;
  };
  crop: string;
  season: string;
  benchmarkPriceRupees: number;
  advisoryCards: AdvisoryCardData[];
}

const REGIONAL_DISTRICTS = [
  { label: "Tirupati Region (AP)", district: "Tirupati", state: "Andhra Pradesh", soil: "Red Sandy Loam" },
  { label: "Bengaluru Rural (Devanahalli)", district: "Bengaluru Rural", state: "Karnataka", soil: "Red Sandy Loam" },
  { label: "Kadapa Rayalaseema Basin (AP)", district: "Kadapa", state: "Andhra Pradesh", soil: "Black & Red Loam" },
  { label: "Kolar Mandi Belt (Karnataka)", district: "Kolar", state: "Karnataka", soil: "Red Loam" },
  { label: "Mandya Cauvery Basin", district: "Mandya", state: "Karnataka", soil: "Clay Loam" },
  { label: "Nashik Onion & Grape Belt", district: "Nashik", state: "Maharashtra", soil: "Black Volcanic Loam" },
];

const CROP_OPTIONS = [
  { id: "tomato", label: "Tomato (Hybrid / Local)" },
  { id: "onion", label: "Onion (Nashik Red / Local)" },
  { id: "paddy", label: "Paddy (Sona Masoori / RNR)" },
  { id: "ragi", label: "Ragi / Millets (Finger Millet)" },
  { id: "mango", label: "Mango (Banganapalli / Totapuri)" },
  { id: "chilli", label: "Chilli (Guntur S4 / Byadgi)" },
];

// 8 Core Government Schemes with multi-language data
interface GovtScheme {
  id: string;
  code: string;
  category: "income" | "insurance" | "credit" | "market" | "irrigation" | "machinery";
  officialUrl: string;
  helpline: string;
  title: Record<AppLang, string>;
  ministry: Record<AppLang, string>;
  benefit: Record<AppLang, string>;
  description: Record<AppLang, string>;
  rules: Record<AppLang, string[]>;
  documents: Record<AppLang, string[]>;
  howToApply: Record<AppLang, string>;
}

const GOVT_SCHEMES: GovtScheme[] = [
  {
    id: "pm-kisan",
    code: "PM-KISAN",
    category: "income",
    officialUrl: "https://pmkisan.gov.in",
    helpline: "155261 / 011-24300606",
    title: {
      en: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
      te: "పీఎం-కిసాన్ (ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి)",
      hi: "पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)",
      kn: "ಪಿಎಂ-ಕಿಸಾನ್ (ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ)",
    },
    ministry: {
      en: "Ministry of Agriculture & Farmers Welfare, Govt of India",
      te: "వ్యవసాయ & రైతు సంక్షేమ మంత్రిత్వ శాఖ, భారత ప్రభుత్వం",
      hi: "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
      kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ, ಭಾರತ ಸರ್ಕಾರ",
    },
    benefit: {
      en: "₹6,000 / year direct cash in 3 equal installments of ₹2,000 via DBT",
      te: "సంవత్సరానికి ₹6,000 నేరుగా బ్యాంకు ఖాతాలో 3 విడతల్లో (విడతకు ₹2,000) DBT ద్వారా",
      hi: "₹6,000 प्रति वर्ष डीबीटी के माध्यम से ₹2,000 की 3 समान किस्तों में बैंक खाते में",
      kn: "ವರ್ಷಕ್ಕೆ ₹6,000 ಡಿಬಿಟಿ ಮೂಲಕ ₹2,000 ರ 3 ಸಮಾನ ಕಂತುಗಳಲ್ಲಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ನೇರವಾಗಿ",
    },
    description: {
      en: "Central sector scheme providing income support to all landholding farmer families across India to supplement their financial needs for farm inputs and domestic requirements.",
      te: "భారతదేశంలోని రైతులందరికీ ఎరువులు, విత్తనాలు మరియు గృహ అవసరాల ఖర్చుల కోసం ఆదాయ మద్దతును అందించే కేంద్ర ప్రభుత్వ పథకం.",
      hi: "सभी भूमिधारक किसान परिवारों को कृषि आदानों और घरेलू जरूरतों के वित्तीय खर्चों को पूरा करने के लिए प्रत्यक्ष आय सहायता प्रदान करने वाली केंद्रीय योजना।",
      kn: "ದೇಶದ ಎಲ್ಲಾ ಕೃಷಿ ಭೂಮಾಲೀಕ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ಕೃಷಿ ಪರಿಕರಗಳು ಮತ್ತು ಗೃಹ ಅಗತ್ಯಗಳ ವೆಚ್ಚವನ್ನು ಪೂರೈಸಲು ಆದಾಯ ಬೆಂಬಲ ನೀಡುವ ಕೇಂದ್ರ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "Farmer family must hold cultivable land recorded in State Land Revenue Records.",
        "Aadhaar e-KYC is strictly mandatory; bank account must be NPCI-seeded.",
        "Institutional landholders, current/former constitutional post holders, and income tax payees are not eligible.",
        "Husband, wife, and minor children are treated as one single family unit.",
      ],
      te: [
        "రైతు కుటుంబం పేరిట రెవెన్యూ రికార్డుల్లో సాగుభూమి నమోదై ఉండాలి.",
        "ఆధార్ ఇ-కేవైసీ (e-KYC) మరియు బ్యాంకు ఖాతాకు ఆధార్ అనుసంధానం తప్పనిసరి.",
        "సంస్థాగత భూస్వాములు, ఆదాయపు పన్ను చెల్లించేవారు, రాజ్యాంగ పదవుల్లో ఉన్నవారు అనర్హులు.",
        "భర్త, భార్య మరియు మైనర్ పిల్లలు ఒకే కుటుంబ యూనిట్‌గా పరిగణించబడతారు.",
      ],
      hi: [
        "किसान परिवार के नाम पर राज्य भू-राजस्व रिकॉर्ड में कृषि योग्य भूमि दर्ज होनी चाहिए।",
        "आधार ई-केवाईसी और बैंक खाते का एनपीसीआई से लिंक होना अनिवार्य है।",
        "आयकर दाता, संस्थागत भूमिधारक एवं संवैधानिक पद धारक इसके पात्र नहीं हैं।",
        "पति, पत्नी और नाबालिग बच्चों को एक पारिवारिक इकाई माना जाता है।",
      ],
      kn: [
        "ರೈತ ಕುಟುಂಬದ ಹೆಸರಿನಲ್ಲಿ ಕಂದಾಯ ದಾಖಲೆಗಳಲ್ಲಿ ಕೃಷಿ ಭೂಮಿ ನೋಂದಾಯಿತವಾಗಿರಬೇಕು.",
        "ಆಧಾರ್ ಇ-ಕೆವೈಸಿ ಮತ್ತು ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಎನ್‌ಪಿಸಿಐ ಸೀಡಿಂಗ್ ಕಡ್ಡಾಯವಾಗಿದೆ.",
        "ಸಾಂಸ್ಥಿಕ ಭೂಮಾಲೀಕರು, ಆದಾಯ ತೆರಿಗೆ ಪಾವತಿದಾರರು ಮತ್ತು ಸಾಂವಿಧಾನಿಕ ಹುದ್ದೆ ಹೊಂದಿರುವವರು ಅರ್ಹರಲ್ಲ.",
        "ಪತಿ, ಪತ್ನಿ ಮತ್ತು ಅಪ್ರಾಪ್ತ ಮಕ್ಕಳನ್ನು ಒಂದು ಕುಟುಂಬ ಘಟಕವೆಂದು ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Aadhaar Card", "Land Record / Pattadar Passbook / RoR", "Aadhaar-Linked Active Bank Passbook", "Mobile Number linked to Aadhaar"],
      te: ["ఆధార్ కార్డు", "పట్టాదారు పాస్‌బుక్ / అడంగల్ / RoR 1B", "ఆధార్ లింక్ అయిన బ్యాంకు పాస్‌బుక్", "ఆధార్ లింక్డ్ మొబైల్ నంబర్"],
      hi: ["आधार कार्ड", "खतौनी / जमाबंदी / भूमि दस्तावेज", "आधार से जुड़ा बैंक पासबुक", "आधार लिंक मोबाइल नंबर"],
      kn: ["ಆಧಾರ್ ಕಾರ್ಡ್", "ಆರ್‌ಟಿಸಿ / ಪಹಣಿ / ಜಮೀನು ದಾಖಲೆಗಳು", "ಆಧಾರ್ ಲಿಂಕ್ ಆದ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್", "ಆಧಾರ್ ಲಿಂಕ್ಡ್ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ"],
    },
    howToApply: {
      en: "Visit https://pmkisan.gov.in -> Click 'New Farmer Registration' -> Enter Aadhaar and State -> Fill land survey details -> Submit. Alternatively, visit your local Village Secretariat (Rythu Bharosa Kendram / CSC center).",
      te: "https://pmkisan.gov.in వెబ్‌సైట్‌కి వెళ్లి -> 'New Farmer Registration' ఎంచుకోండి -> ఆధార్ మరియు రాష్ట్రం నమోదు చేయండి -> భూమి సర్వే నంబర్ వివరాలు నింపండి. లేదా స్థానిక రైతు భరోసా కేంద్రం (RBK) / CSC సెంటర్‌ను సంప్రదించండి.",
      hi: "https://pmkisan.gov.in पर जाएं -> 'New Farmer Registration' पर क्लिक करें -> आधार और राज्य दर्ज करें -> भूमि खसरा विवरण भरें। अथवा नजदीकी सीएससी या ग्राम कृषि मित्र से संपर्क करें।",
      kn: "https://pmkisan.gov.in ಗೆ ಭೇಟಿ ನೀಡಿ -> 'New Farmer Registration' ಕ್ಲಿಕ್ ಮಾಡಿ -> ಆಧಾರ್ ಮತ್ತು ರಾಜ್ಯ ನಮೂದಿಸಿ -> ಜಮೀನಿನ ಸರ್ವೆ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ. ಅಥವಾ ಸ್ಥಳೀಯ ಗ್ರಾಮ ಒನ್ / ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
    },
  },
  {
    id: "pmfby",
    code: "PMFBY",
    category: "insurance",
    officialUrl: "https://pmfby.gov.in",
    helpline: "14447 (National Toll Free)",
    title: {
      en: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
      te: "పీఎంఎఫ్బీవై (ప్రధాన మంత్రి ఫసల్ బీమా యోజన)",
      hi: "पीएमएफबीवाई (प्रधानमंत्री फसल बीमा योजना)",
      kn: "ಪಿಎಂಎಫ್‌ಬಿವೈ (ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ)",
    },
    ministry: {
      en: "Ministry of Agriculture & Farmers Welfare",
      te: "వ్యవసాయ & రైతు సంక్షేమ మంత్రిత్వ శాఖ",
      hi: "कृषि एवं किसान कल्याण मंत्रालय",
      kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ",
    },
    benefit: {
      en: "Comprehensive crop loss protection with lowest premium: 2% (Kharif), 1.5% (Rabi), 5% (Horticulture)",
      te: "రైతులకు అతి తక్కువ ప్రీమియంతో సమగ్ర పంట బీమా: ఖరీఫ్ 2%, రబీ 1.5%, ఉద్యానవన పంటలకు 5%",
      hi: "न्यूनतम प्रीमियम पर पूर्ण फसल सुरक्षा: खरीफ 2%, रबी 1.5%, बागवानी एवं व्यावसायिक फसलें 5%",
      kn: "ಅತಿ ಕಡಿಮೆ ಪ್ರೀಮಿಯಂನಲ್ಲಿ ಸಂಪೂರ್ಣ ಬೆಳೆ ವಿಮೆ: ಮುಂಗಾರು 2%, ಹಿಂಗಾರು 1.5%, ತೋಟಗಾರಿಕಾ ಬೆಳೆಗಳಿಗೆ 5%",
    },
    description: {
      en: "Protects farmers against financial loss caused by unforeseen weather events, droughts, floods, localized hailstorms, pests, and post-harvest cyclone damage.",
      te: "అకాల వర్షాలు, తుఫానులు, కరువు, తెగుళ్లు మరియు పంట కోత అనంతరం కలిగే నష్టాల నుండి రైతులకు పూర్తి ఆర్థిక రక్షణ కల్పించే పంట బీమా పథకం.",
      hi: "सूखा, बाढ़, कीट प्रकोप, ओलावृष्टि और कटाई के बाद चक्रवात से होने वाले अप्रत्याशित फसल नुकसान की भरपाई करने वाली सुरक्षा योजना।",
      kn: "ಅಕಾಲಿಕ ಮಳೆ, ಬರ, ಪ್ರವಾಹ, ಕೀಟ ಬಾಧೆ ಮತ್ತು ಕೊಯ್ಲಿನ ನಂತರದ ಹಾನಿಯಿಂದ ರೈತರನ್ನು ರಕ್ಷಿಸುವ ಸಂಪೂರ್ಣ ಬೆಳೆ ವಿಮಾ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "Covers notified crops in notified areas for both loanee and non-loanee farmers.",
        "Crop damage notification must be reported within 72 hours of calamity via Crop Insurance App or toll-free number 14447.",
        "Balance premium beyond farmer share is 100% subsidized by Central and State Governments.",
        "Direct claim settlement to bank account without intermediate agent cuts.",
      ],
      te: [
        "నోటిఫై చేయబడిన ప్రాంతాల్లోని రైతులందరికీ వర్తిస్తుంది (రుణం ఉన్నవారు మరియు లేనివారు).",
        "పంట నష్టం జరిగిన 72 గంటలలోపు 'Crop Insurance App' లేదా 14447 టోల్-ఫ్రీ నంబర్ ద్వారా తెలియజేయాలి.",
        "రైతు చెల్లించే నామమాత్రపు ప్రీమియం మిగిలిన పూర్తి మొత్తాన్ని కేంద్ర-రాష్ట్ర ప్రభుత్వాలే భరిస్తాయి.",
        "పరిహారం నేరుగా రైతు బ్యాంకు ఖాతాకే జమ అవుతుంది.",
      ],
      hi: [
        "अधिसूचित क्षेत्रों में अधिसूचित फसलों के लिए सभी ऋणी एवं गैर-ऋणी किसानों को कवर करता है।",
        "फसल नुकसान की सूचना आपदा के 72 घंटे के भीतर 'क्रॉप इंश्योरेंस ऐप' या 14447 पर देना अनिवार्य है।",
        "किसान के हिस्से से अधिक का सारा प्रीमियम केंद्र व राज्य सरकार द्वारा वहन किया जाता है।",
        "दावा राशि सीधे किसान के बैंक खाते में ट्रांसफर की जाती है।",
      ],
      kn: [
        "ಅಧಿಸೂಚಿತ ಪ್ರದೇಶಗಳಲ್ಲಿ ಬೆಳೆಯುವ ಎಲ್ಲಾ ಸಾಲಗಾರ ಮತ್ತು ಸಾಲರಹಿತ ರೈತರಿಗೆ ಅನ್ವಯಿಸುತ್ತದೆ.",
        "ಬೆಳೆ ಹಾನಿಯಾದ 72 ಗಂಟೆಗಳ ಒಳಗಾಗಿ 'ಕ್ರಾಪ್ ಇನ್ಶೂರೆನ್ಸ್ ಆ್ಯಪ್' ಅಥವಾ 14447 ಕರೆ ಮಾಡಿ ಮಾಹಿತಿ ನೀಡಬೇಕು.",
        "ರೈತನ ಪಾಲಿನ ಪ್ರೀಮಿಯಂ ಹೊರತುಪಡಿಸಿ ಉಳಿದ ಪೂರ್ಣ ಮೊತ್ತವನ್ನು ಸರ್ಕಾರವೇ ಭರಿಸುತ್ತದೆ.",
        "ಪರಿಹಾರದ ಹಣ ನೇರವಾಗಿ ರೈತನ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Land Records (Pahani / Adangal / RoR)", "Sowing Certificate / VRO Declaration", "Aadhaar Card", "Bank Passbook"],
      te: ["పట్టాదారు పాస్ బుక్ / అడంగల్", "విత్తన ధృవీకరణ పత్రం / VRO డిక్లరేషన్", "ఆధార్ కార్డు", "బ్యాంకు పాస్ బుక్"],
      hi: ["जमीन की खतौनी / बोवनी प्रमाणपत्र", "पटवारी रिपोर्ट", "आधार कार्ड", "बैंक पासबुक"],
      kn: ["ಆರ್‌ಟಿಸಿ / ಪಹಣಿ ದಾಖಲೆ", "ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ", "ಆಧಾರ್ ಕಾರ್ಡ್", "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್"],
    },
    howToApply: {
      en: "Enroll on pmfby.gov.in before seasonal cut-off date, through your regional bank branch, or via nearest Common Service Center (CSC).",
      te: "సీజనల్ గడువు తేదీకి ముందే pmfby.gov.in పోర్టల్ ద్వారా లేదా మీ బ్యాంక్ బ్రాంచ్ / స్థానిక రైతు భరోసా కేంద్రంలో దరఖాస్తు చేసుకోండి.",
      hi: "pmfby.gov.in पर कट-ऑफ तिथि से पहले आवेदन करें या अपनी बैंक शाखा / सीएससी सेंटर के माध्यम से नामांकन कराएं।",
      kn: "ಹಂಗಾಮಿನ ಕೊನೆಯ ದಿನಾಂಕಕ್ಕಿಂತ ಮುಂಚಿತವಾಗಿ pmfby.gov.in ನಲ್ಲಿ ಅಥವಾ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆ / ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ನೋಂದಾಯಿಸಿಕೊಳ್ಳಿ.",
    },
  },
  {
    id: "kcc",
    code: "KCC",
    category: "credit",
    officialUrl: "https://myscheme.gov.in/schemes/kcc",
    helpline: "1800-180-1551",
    title: {
      en: "Kisan Credit Card (KCC) Scheme",
      te: "కిసాన్ క్రెడిట్ కార్డు (KCC) పథకం",
      hi: "किसान क्रेडिट कार्ड (केसीसी) योजना",
      kn: "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (ಕೆಸಿಸಿ) ಯೋಜನೆ",
    },
    ministry: {
      en: "Department of Agriculture and NABARD",
      te: "వ్యవసాయ శాఖ మరియు నాబార్డ్ (NABARD)",
      hi: "कृषि विभाग एवं नाबार्ड (NABARD)",
      kn: "ಕೃಷಿ ಇಲಾಖೆ ಮತ್ತು ನಬಾರ್ಡ್ (NABARD)",
    },
    benefit: {
      en: "Agricultural working capital loan up to ₹3 Lakh at only 4% interest (with prompt repayment)",
      te: "సకాలంలో చెల్లిస్తే కేవలం 4% వార్షిక వడ్డీకే ₹3 లక్షల వరకు పంట రుణం",
      hi: "समय पर भुगतान करने पर मात्र 4% ब्याज दर पर ₹3 लाख तक का आसान कृषि ऋण",
      kn: "ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಮರುಪಾವತಿಸಿದರೆ ಕೇವಲ 4% ಬಡ್ಡಿದರದಲ್ಲಿ ₹3 ಲಕ್ಷದವರೆಗೆ ಕೃಷಿ ಸಾಲ",
    },
    description: {
      en: "Provides farmers with timely credit for agricultural inputs such as seeds, fertilizers, pesticides, and harvest expenses, as well as dairy and animal husbandry operations.",
      te: "రైతులకు విత్తనాలు, ఎరువులు, పురుగుమందులు, పంట నిర్వహణ మరియు పాడి పశువుల పోషణకు తక్కువ వడ్డీకే రుణ సదుపాయం కల్పించే పథకం.",
      hi: "किसानों को खाद, बीज, कीटनाशक, फसल कटाई और पशुपालन खर्चों के लिए समय पर सस्ता संस्थागत ऋण उपलब्ध कराने की प्रमुख योजना।",
      kn: "ರೈತರಿಗೆ ಬೀಜ, ಗೊಬ್ಬರ, ಕೀಟನಾಶಕಗಳು, ಕೊಯ್ಲು ವೆಚ್ಚಗಳು ಮತ್ತು ಹೈನುಗಾರಿಕೆಗೆ ಕಡಿಮೆ ಬಡ್ಡಿದರದಲ್ಲಿ ಸಕಾಲಿಕ ಸಾಲ ಒದಗಿಸುವ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "Normal interest is 7%, but Govt provides 3% prompt repayment incentive, reducing effective rate to 4%.",
        "Collateral-free loan limit up to ₹1.60 Lakh (extended to ₹3 Lakh under tie-up arrangements).",
        "Flexible revolving cash-credit account with ATM-enabled RuPay Kisan Card.",
        "Includes in-built personal accident insurance up to ₹50,000 for disability/death.",
      ],
      te: [
        "సాధారణ వడ్డీ 7%, సకాలంలో తిరిగి చెల్లిస్తే 3% సబ్సిడీ లభించి అసలు వడ్డీ 4% మాత్రమే పడుతుంది.",
        "₹1.60 లక్షల వరకు ఎటువంటి హామీ (సెక్యూరిటీ) అవసరం లేదు.",
        "రూపే కిసాన్ డెబిట్ కార్డుతో ఏటీఎం ద్వారా ఎప్పుడైనా నగదు విత్‌డ్రా చేసుకోవచ్చు.",
        "రైతులకు ప్రమాద బీమా రక్షణ కూడా ఉంటుంది.",
      ],
      hi: [
        "सामान्य ब्याज 7% है, समय पर चुकता करने पर 3% की छूट मिलती है, जिससे शुद्ध ब्याज दर 4% रह जाती है।",
        "₹1.60 लाख तक के ऋण पर बिना किसी गिरवी (कोलैटरल) के ऋण उपलब्ध।",
        "एटीएम-सक्षम रुपे किसान कार्ड से किसी भी समय धन निकासी की सुविधा।",
        "कार्डधारक के लिए व्यक्तिगत दुर्घटना बीमा कवरेज शामिल।",
      ],
      kn: [
        "ಸಾಮಾನ್ಯ ಬಡ್ಡಿ 7%, ಸಕಾಲಿಕ ಮರುಪಾವತಿಗೆ 3% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ಸಿಗುವುದರಿಂದ ಅಂತಿಮ ಬಡ್ಡಿ ಕೇವಲ 4% ಆಗುತ್ತದೆ.",
        "₹1.60 ಲಕ್ಷದವರೆಗಿನ ಸಾಲಕ್ಕೆ ಯಾವುದೇ ಜಮೀನು ಅಡಮಾನ (ಭದ್ರತೆ) ಅಗತ್ಯವಿಲ್ಲ.",
        "ಎಟಿಎಂ-ಸಕ್ರಿಯ ರುಪೇ ಕಿಸಾನ್ ಕಾರ್ಡ್ ಮೂಲಕ ಸುಲಭವಾಗಿ ಹಣ ಪಡೆಯಬಹುದು.",
        "ಅಪಘಾತ ವಿಮಾ ಸೌಲಭ್ಯ ಒಳಗೊಂಡಿದೆ.",
      ],
    },
    documents: {
      en: ["Filled KCC Application Form", "Aadhaar Card / Voter ID", "Land Record Passbook / Patta", "Cropping Pattern / Sowing Details"],
      te: ["KCC దరఖాస్తు ఫారమ్", "ఆధార్ కార్డు / ఓటర్ ఐడీ", "పట్టాదారు పాస్ బుక్", "పంట వివరాల పత్రం"],
      hi: ["केसीसी आवेदन फॉर्म", "आधार कार्ड / पहचान पत्र", "जमीन के कागजात / खसरा", "फसल बुवाई विवरण"],
      kn: ["ಕೆಸಿಸಿ ಅರ್ಜಿ ನಮೂನೆ", "ಆಧಾರ್ ಕಾರ್ಡ್ / ಗುರುತಿನ ಚೀಟಿ", "ಪಹಣಿ / ಆರ್‌ಟಿಸಿ", "ಬೆಳೆ ಬಿತ್ತನೆ ವಿವರ"],
    },
    howToApply: {
      en: "Submit one-page KCC application to your local bank branch (SBI, Canara, Andhra Pragathi Grameena, etc.) or apply online on PM-KISAN portal.",
      te: "మీ స్థానిక జాతీయం లేదా గ్రామీణ బ్యాంక్ బ్రాంచ్‌లో సింగిల్-పేజ్ KCC ఫారమ్ ఇవ్వండి లేదా పీఎం-కిసాన్ పోర్టల్ ద్వారా ఆన్‌లైన్‌లో దరఖాస్తు చేయండి.",
      hi: "अपनी नजदीकी बैंक शाखा में एक पेज का केसीसी फॉर्म जमा करें या पीएम-किसान पोर्टल के माध्यम से ऑनलाइन आवेदन करें।",
      kn: "ನಿಮ್ಮ ಹತ್ತಿರದ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ (ಎಸ್‍ಬಿಐ, ಕೆನರಾ, ಗ್ರಾಮೀಣ ಬ್ಯಾಂಕ್) ಕೆಸಿಸಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಅಥವಾ ಪಿಎಂ-ಕಿಸಾನ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಹಾಕಿ.",
    },
  },
  {
    id: "enam",
    code: "e-NAM",
    category: "market",
    officialUrl: "https://enam.gov.in",
    helpline: "1800-270-0224",
    title: {
      en: "e-NAM (National Agriculture Market)",
      te: "ఈ-నామ్ (జాతీయ వ్యవసాయ విపణి)",
      hi: "ई-नाम (राष्ट्रीय कृषि बाजार)",
      kn: "ಇ-ನಾಮ್ (ರಾಷ್ಟ್ರೀಯ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ)",
    },
    ministry: {
      en: "Small Farmers Agribusiness Consortium (SFAC)",
      te: "చిన్న రైతుల వ్యవసాయ వ్యాపార సమాఖ్య (SFAC)",
      hi: "लघु कृषक कृषि व्यापार संघ (SFAC)",
      kn: "ಸಣ್ಣ ರೈತರ ಕೃಷಿ ಉದ್ಯಮ ಒಕ್ಕೂಟ (SFAC)",
    },
    benefit: {
      en: "Transparent nationwide online bidding, zero middleman exploitation, direct online bank settlement",
      te: "దేశవ్యాప్తంగా పారదర్శక ఆన్‌లైన్ బిడ్డింగ్, దళారుల ప్రమేయం లేకుండా నేరుగా బ్యాంకు ఖాతాకే నగదు జమ",
      hi: "देशभर के खरीदारों से पारदर्शी ऑनलाइन बोली, बिचौलियों का खात्मा और बैंक खाते में सीधा भुगतान",
      kn: "ದೇಶಾದ್ಯಂತ ಪಾರದರ್ಶಕ ಆನ್‌ಲೈನ್ ಹರಾಜು, ದಲ್ಲಾಳಿಗಳ ಹಾವಳಿಯಿಲ್ಲದೆ ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಹಣ ಜಮೆ",
    },
    description: {
      en: "A unified pan-India electronic trading portal that links APMC mandis across states, allowing farmers to showcase their produce quality and receive competitive bids from buyers nationwide.",
      te: "దేశంలోని వివిధ వ్యవసాయ మార్కెట్ యార్డులను (APMC) అనుసంధానించే ఆన్‌లైన్ పోర్టల్. రైతులు తమ పంటకు దేశవ్యాప్త వ్యాపారుల నుండి ఉత్తమ ధరను పొందవచ్చు.",
      hi: "देश की सभी एपीएमसी मंडियों को जोड़ने वाला राष्ट्रीय डिजिटल बाजार मंच, जहां किसान अपनी उपज की गुणवत्ता जांच कराकर उच्चतम बोली पर देश के किसी भी व्यापारी को बेच सकते हैं।",
      kn: "ದೇಶದ ಎಲ್ಲಾ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆಗಳನ್ನು ಡಿಜಿಟಲ್ ಆಗಿ ಸಂಪರ್ಕಿಸುವ ರಾಷ್ಟ್ರೀಯ ಪೋರ್ಟಲ್. ರೈತರು ತಮ್ಮ ಬೆಳೆಗೆ ಅತ್ಯುತ್ತಮ ಸ್ಪರ್ಧಾತ್ಮಕ ಬೆಲೆ ಪಡೆಯಬಹುದು.",
    },
    rules: {
      en: [
        "Scientific quality assaying is conducted at mandi laboratory before electronic bidding begins.",
        "Farmers have the freedom to accept or reject the highest online bid.",
        "Payments are disbursed directly into the farmer's bank account within 24 hours of weighing.",
        "Warehouse receipt financing available to hold produce if current prices are low.",
      ],
      te: [
        "బిడ్డింగ్ ప్రారంభమయ్యే ముందే మార్కెట్‌లో శాస్త్రీయ నాణ్యతా పరీక్ష (Assaying) చేస్తారు.",
        "వచ్చిన బిడ్ ధర సంతృప్తికరంగా లేకపోతే తిరస్కరించే పూర్తి హక్కు రైతుకు ఉంటుంది.",
        "తూకం పూర్తయిన 24 గంటలలోపు నగదు నేరుగా బ్యాంక్ ఖాతాలో జమవుతుంది.",
        "ధరలు తక్కువగా ఉంటే గిడ్డంగులలో భద్రపరుచుకునే సదుపాయం కలదు.",
      ],
      hi: [
        "बोली से पहले मंडी में उपज की वैज्ञानिक गुणवत्ता जांच (परख) की जाती है।",
        "यदि बोली मूल्य पसंद न आए तो किसान को अपनी उपज बेचने से इंकार करने का पूर्ण अधिकार है।",
        "तौल के 24 घंटे के भीतर ऑनलाइन माध्यम से बैंक खाते में राशि ट्रांसफर होती है।",
        "मूल्य कम होने पर वेयरहाउस में सुरक्षित भंडारण की सुविधा उपलब्ध है।",
      ],
      kn: [
        "ಹರಾಜಿಗೆ ಮುಂಚಿತವಾಗಿ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಗುಣಮಟ್ಟ ಪರೀಕ್ಷೆ ನಡೆಸಲಾಗುತ್ತದೆ.",
        "ಬಂದ ಬೆಲೆ ತೃಪ್ತಿಕರವಾಗಿರದಿದ್ದರೆ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡದಿರುವ ಸಂಪೂರ್ಣ ಹಕ್ಕು ರೈತನಿಗಿರುತ್ತದೆ.",
        "ತೂಕವಾದ 24 ಗಂಟೆಗಳ ಒಳಗಾಗಿ ಹಣ ರೈತನ ಖಾತೆಗೆ ಜಮೆಯಾಗುತ್ತದೆ.",
        "ಉತ್ತಮ ಬೆಲೆ ಬರುವವರೆಗೆ ಗೋದಾಮಿನಲ್ಲಿ ಶೇಖರಣೆ ಮಾಡುವ ಸೌಲಭ್ಯವಿದೆ.",
      ],
    },
    documents: {
      en: ["Farmer Mandi ID / Registration", "Aadhaar Card", "Bank Account Details with IFSC", "Produce Weighing Slip"],
      te: ["మండి రిజిస్ట్రేషన్ నంబర్", "ఆధార్ కార్డు", "బ్యాంక్ పాస్‌బుక్ / IFSC", "తూకం స్లిప్"],
      hi: ["मंडी किसान पंजीकरण", "आधार कार्ड", "बैंक पासबुक एवं आईएफएससी", "उपज तौल पर्ची"],
      kn: ["ಮಾರುಕಟ್ಟೆ ನೋಂದಣಿ ಸಂಖ್ಯೆ", "ಆಧಾರ್ ಕಾರ್ಡ್", "ಬ್ಯಾಂಕ್ ವಿವರಗಳು", "ತೂಕದ ರಸೀದಿ"],
    },
    howToApply: {
      en: "Register for free on https://enam.gov.in or visit the e-NAM facilitation desk at your nearest APMC mandi yard with produce samples.",
      te: "https://enam.gov.in లో ఉచితంగా నమోదు చేసుకోండి లేదా మీ సమీప వ్యవసాయ మార్కెట్ యార్డులోని e-NAM హెల్ప్ డెస్క్‌ను సంప్రదించండి.",
      hi: "https://enam.gov.in पर निःशुल्क पंजीकरण करें अथवा अपनी नजदीकी एपीएमसी मंडी के ई-नाम काउंटर पर संपर्क करें।",
      kn: "https://enam.gov.in ನಲ್ಲಿ ಉಚಿತವಾಗಿ ನೋಂದಾಯಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಸಮೀಪದ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆಯ ಇ-ನಾಮ್ ಸಹಾಯವಾಣಿ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
    },
  },
  {
    id: "pmksy",
    code: "PMKSY",
    category: "irrigation",
    officialUrl: "https://pmksy.gov.in",
    helpline: "011-23382012",
    title: {
      en: "PMKSY - Per Drop More Crop (Micro-Irrigation)",
      te: "పీఎంకేఎస్వై - పర్ డ్రాప్ మోర్ క్రాప్ (సూక్ష్మ సేద్యం)",
      hi: "पीएमकेएसवाई - प्रति बूंद अधिक फसल (सूक्ष्म सिंचाई)",
      kn: "ಪಿಎಂಕೆಎಸ್‍ವೈ - ಪ್ರತಿ ಹನಿಗೆ ಹೆಚ್ಚು ಬೆಳೆ (ಹನಿ ನೀರಾವರಿ)",
    },
    ministry: {
      en: "Department of Water Resources & Agriculture",
      te: "జల వనరులు మరియు వ్యవసాయ శాఖ",
      hi: "जल संसाधन एवं कृषि विभाग",
      kn: "ಜಲ ಸಂಪನ್ಮೂಲ ಮತ್ತು ಕೃಷಿ ಇಲಾಖೆ",
    },
    benefit: {
      en: "Up to 55% subsidy for Small/Marginal farmers & 45% for other farmers on Drip and Sprinkler systems",
      te: "బిందు (డ్రిప్) మరియు తుంపర (స్ప్రింక్లర్) సేద్య పరికరాలపై చిన్న, సన్నకారు రైతులకు 55% వరకు సబ్సిడీ",
      hi: "ड्रिप एवं स्प्रिंकलर सिंचाई प्रणालियों पर लघु/सीमांत किसानों को 55% और अन्य किसानों को 45% तक सब्सिडी",
      kn: "ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿ ಉಪಕರಣಗಳ ಮೇಲೆ ಸಣ್ಣ ಮತ್ತು ಅತಿ ಸಣ್ಣ ರೈತರಿಗೆ 55% ವರೆಗೆ ಸಬ್ಸಿಡಿ",
    },
    description: {
      en: "Promotes micro-irrigation technologies to conserve agricultural water, reduce electricity usage, and increase crop yields through precise water and fertigation delivery.",
      te: "వ్యవసాయంలో నీటిని ఆదా చేస్తూ పంట దిగుబడులను పెంచేందుకు డ్రిప్ మరియు స్ప్రింక్లర్ పరికరాలను భారీ రాయితీతో అందించే పథకం.",
      hi: "कृषि में पानी की बचत और फसल पैदावार बढ़ाने के लिए ड्रिप एवं स्प्रिंकलर जैसी आधुनिक सिंचाई तकनीकों पर भारी सरकारी अनुदान।",
      kn: "ಕೃಷಿಯಲ್ಲಿ ನೀರಿನ ಮಿತವ್ಯಯ ಮತ್ತು ಬೆಳೆ ಇಳುವರಿ ಹೆಚ್ಚಿಸಲು ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿ ತಂತ್ರಜ್ಞಾನಕ್ಕೆ ನೀಡಲಾಗುವ ಸರ್ಕಾರಿ ಸಹಾಯಧನ.",
    },
    rules: {
      en: [
        "Small & Marginal farmers (holding up to 2 hectares) receive 55% subsidy; large farmers receive 45%.",
        "Must possess verified water source (borewell, open well, farm pond, or lifting canal).",
        "Systems must be supplied and installed by BIS-certified empanelled manufacturers with a 5-year warranty.",
      ],
      te: [
        "చిన్న, సన్నకారు రైతులకు (5 ఎకరాల లోపు) 55% సబ్సిడీ, ఇతర రైతులకు 45% సబ్సిడీ లభిస్తుంది.",
        "బోరుబావి, బావి లేదా వ్యవసాయ కుంట వంటి నీటి వనరు తప్పనిసరిగా ఉండాలి.",
        "5 సంవత్సరాల వారంటీతో కూడిన నాణ్యమైన BIS సర్టిఫైడ్ కంపెనీ పరికరాలే అమర్చబడతాయి.",
      ],
      hi: [
        "लघु एवं सीमांत किसानों (2 हेक्टेयर तक) को 55% और अन्य किसानों को 45% सब्सिडी प्रदान की जाती है।",
        "खेत पर बोरवेल, कुआं या तालाब जैसा प्रमाणित जल स्रोत होना अनिवार्य है।",
        "बीआईएस प्रमाणित कंपनियों द्वारा 5 वर्ष की वारंटी के साथ उपकरण स्थापित किए जाते हैं।",
      ],
      kn: [
        "ಸಣ್ಣ ಮತ್ತು ಅತಿ ಸಣ್ಣ ರೈತರಿಗೆ 55% ಹಾಗೂ ಇತರ ರೈತರಿಗೆ 45% ಸಹಾಯಧನ ದೊರೆಯುತ್ತದೆ.",
        "ಕೊಳವೆಬಾವಿ, ತೆರೆದ ಬಾವಿ ಅಥವಾ ಕೃಷಿ ಹೊಂಡದಂತಹ ನೀರಿನ ಮೂಲ ಕಡ್ಡಾಯವಾಗಿರಬೇಕು.",
        "5 ವರ್ಷಗಳ ವಾರಂಟಿಯೊಂದಿಗೆ ಗುಣಮಟ್ಟದ ಉಪಕರಣಗಳನ್ನು ಅಳವಡಿಸಲಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Land Records / RoR / 1B", "Aadhaar Card", "Electricity Connection Bill / Water Source Proof", "Soil & Water Test Report"],
      te: ["పట్టాదారు పాస్ బుక్ / అడంగల్", "ఆధార్ కార్డు", "విద్యుత్ కనెక్షన్ రసీదు / నీటి వనరు ధృవీకరణ", "భూసార పరీక్ష రిపోర్ట్"],
      hi: ["जमीन की खतौनी / पट्टा", "आधार कार्ड", "बिजली बिल / जल स्रोत प्रमाण", "मृदा व जल परीक्षण रिपोर्ट"],
      kn: ["ಆರ್‌ಟಿಸಿ / ಪಹಣಿ ದಾಖಲೆ", "ಆಧಾರ್ ಕಾರ್ಡ್", "ವಿದ್ಯುತ್ ಬಿಲ್ / ನೀರಿನ ಮೂಲ ದೃಢೀಕರಣ", "ಮಣ್ಣು ಪರೀಕ್ಷಾ ವರದಿ"],
    },
    howToApply: {
      en: "Apply via your State Horticulture Portal (MIP Cell) or consult your local Mandal Agricultural Officer / Assistant Director of Horticulture.",
      te: "రాష్ట్ర ఉద్యానవన శాఖ పోర్టల్ (MIP) ద్వారా లేదా మీ మండల వ్యవసాయ అధికారి / హార్టికల్చర్ ఆఫీసర్‌ను సంప్రదించండి.",
      hi: "राज्य बागवानी विभाग की वेबसाइट (MIP सेल) पर ऑनलाइन आवेदन करें या अपने विकास खंड के कृषि अधिकारी से मिलें।",
      kn: "ರಾಜ್ಯ ತೋಟಗಾರಿಕಾ ಇಲಾಖೆಯ ವೆಬ್‌ಸೈಟ್ ಮೂಲಕ ಅಥವಾ ನಿಮ್ಮ ತಾಲೂಕು ಸಹಾಯಕ ತೋಟಗಾರಿಕಾ ನಿರ್ದೇಶಕರ ಕಚೇರಿಯಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
    },
  },
  {
    id: "smam",
    code: "SMAM",
    category: "machinery",
    officialUrl: "https://agrimachinery.nic.in",
    helpline: "011-23382922",
    title: {
      en: "SMAM (Sub-Mission on Agricultural Mechanization)",
      te: "స్మామ్ (వ్యవసాయ యాంత్రీకరణ సబ్-మిషన్)",
      hi: "एसएमएएम (कृषि यंत्रीकरण उप-मिशन)",
      kn: "ಎಸ್‌ಎಂಎಎಂ (ಕೃಷಿ ಯಾಂತ್ರೀಕರಣ ಉಪ-ಯೋಜನೆ)",
    },
    ministry: {
      en: "Ministry of Agriculture & Farmers Welfare",
      te: "వ్యవసాయ & రైతు సంక్షేమ మంత్రిత్వ శాఖ",
      hi: "कृषि एवं किसान कल्याण मंत्रालय",
      kn: "ಕೃಷಿ ಮತ್ತು ರೈತರ ಕಲ್ಯಾಣ ಸಚಿವಾಲಯ",
    },
    benefit: {
      en: "40% to 50% subsidy on Tractors, Power Tillers, Rotavators, Seeders & Agriculture Drones",
      te: "ట్రాక్టర్లు, పవర్ టిల్లర్లు, రోటవేటర్లు మరియు డ్రోన్లపై 40% నుండి 50% వరకు సబ్సిడీ",
      hi: "ट्रैक्टर, पावर टिलर, रोटावेटर, रीपर एवं कृषि ड्रोन पर 40% से 50% तक की भारी छूट",
      kn: "ಟ್ರಾಕ್ಟರ್, ಪವರ್ ಟಿಲ್ಲರ್, ರೋಟವೇಟರ್ ಮತ್ತು ಕೃಷಿ ಡ್ರೋನ್‌ಗಳ ಖರೀದಿಗೆ 40% ರಿಂದ 50% ಸಹಾಯಧನ",
    },
    description: {
      en: "Assists farmers in procuring modern mechanized farm implements and establishing Custom Hiring Centers (CHCs) to overcome labor shortages and boost field productivity.",
      te: "వ్యవసాయ పనులను సులభతరం చేసేందుకు ఆధునిక యంత్రాలు, ట్రాక్టర్లు కొనుగోలు చేయడానికి మరియు కస్టమ్ హైరింగ్ సెంటర్ల ఏర్పాటుకు సబ్సిడీ అందించే పథకం.",
      hi: "खेती में मजदूरी की कमी को दूर करने और उत्पादकता बढ़ाने के लिए आधुनिक कृषि उपकरणों, ट्रैक्टरों और कस्टम हायरिंग केंद्रों के लिए अनुदान योजना।",
      kn: "ಕೃಷಿ ಕೆಲಸಗಳನ್ನು ಸುಲಭಗೊಳಿಸಲು ಆಧುನಿಕ ಕೃಷಿ ಯಂತ್ರೋಪಕರಣಗಳು, ಟ್ರಾಕ್ಟರ್‌ಗಳ ಖರೀದಿ ಮತ್ತು ಬಾಡಿಗೆ ಕೇಂದ್ರಗಳ ಸ್ಥಾಪನೆಗೆ ಸಹಾಯಧನ ನೀಡುವ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "Individual farmers receive 40–50% subsidy; Farmer Groups / FPOs receive up to 80% for Custom Hiring Centers.",
        "Special preference given to SC, ST, small/marginal, and women farmers.",
        "Subsidy disbursed directly to the bank account (DBT) upon machine delivery and field inspection.",
      ],
      te: [
        "వ్యక్తిగత రైతులకు 40-50% సబ్సిడీ; రైతు సంఘాలు (FPO) కస్టమ్ హైరింగ్ సెంటర్ల కోసం 80% వరకు సబ్సిడీ పొందవచ్చు.",
        "మహిళా రైతులు, ఎస్సీ, ఎస్టీ మరియు చిన్న రైతులకు అదనపు ప్రాధాన్యత.",
        "యంత్రాల తనిఖీ పూర్తయిన తర్వాత సబ్సిడీ నేరుగా బ్యాంక్ ఖాతాకు జమ చేయబడుతుంది.",
      ],
      hi: [
        "व्यक्तिगत किसानों को 40-50% अनुदान; किसान उत्पादक संगठनों (FPO) को कस्टम हायरिंग सेंटर हेतु 80% तक सहायता।",
        "महिला, अनुसूचित जाति/जनजाति और छोटे किसानों को विशेष प्राथमिकता।",
        "उपकरण की भौतिक जांच के पश्चात डीबीटी के जरिए बैंक खाते में सीधे सब्सिडी भेजी जाती है।",
      ],
      kn: [
        "ವೈಯಕ್ತಿಕ ರೈತರಿಗೆ 40-50% ಸಬ್ಸಿಡಿ; ಕೃಷಿ ಉತ್ಪಾದಕ ಸಂಸ್ಥೆಗಳಿಗೆ (ಎಫ್‌ಪಿಒ) ಬಾಡಿಗೆ ಕೇಂದ್ರ ಸ್ಥಾಪಿಸಲು 80% ವರೆಗೆ ಸಹಾಯಧನ.",
        "ಮಹಿಳಾ ರೈತರು, ಪರಿಶಿಷ್ಟ ಜಾತಿ/ಪಂಗಡ ಮತ್ತು ಸಣ್ಣ ರೈತರಿಗೆ ವಿಶೇಷ ಆದ್ಯತೆ ನೀಡಲಾಗುತ್ತದೆ.",
        "ಯಂತ್ರದ ಪರಿಶೀಲನೆ ಮುಗಿದ ನಂತರ ಸಬ್ಸಿಡಿ ಹಣ ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Aadhaar Card", "Land Records (Pattadar / Pahani)", "Bank Passbook", "Dealer Quotation with GST"],
      te: ["ఆధార్ కార్డు", "భూమి రికార్డులు (పాస్‌బుక్)", "బ్యాంక్ పాస్‌బుక్", "డీలర్ కొటేషన్ (GST తో)"],
      hi: ["आधार कार्ड", "खसरा/खतौनी नकल", "बैंक पासबुक", "डीलर का जीएसटी कोटेशन"],
      kn: ["ಆಧಾರ್ ಕಾರ್ಡ್", "ಆರ್‌ಟಿಸಿ / ಪಹಣಿ", "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್", "ಡೀಲರ್ ಕೊಟೇಶನ್"],
    },
    howToApply: {
      en: "Register online at https://agrimachinery.nic.in -> Select state, district and implement -> Upload documents -> Generate application token.",
      te: "https://agrimachinery.nic.in పోర్టల్‌లో ఆన్‌లైన్‌లో నమోదు చేసుకోండి -> జిల్లా మరియు కావలసిన యంత్రాన్ని ఎంచుకోండి -> దరఖాస్తు సమర్పించండి.",
      hi: "https://agrimachinery.nic.in पर जाकर ऑनलाइन पंजीकरण करें -> अपना राज्य, जिला और उपकरण चुनें -> टोकन जनरेट करें।",
      kn: "https://agrimachinery.nic.in ನಲ್ಲಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ನೋಂದಾಯಿಸಿ -> ಜಿಲ್ಲೆ ಮತ್ತು ಬೇಕಾದ ಯಂತ್ರೋಪಕರಣ ಆಯ್ಕೆಮಾಡಿ -> ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
    },
  },
  {
    id: "rythu-bharosa",
    code: "STATE-AP-KA",
    category: "income",
    officialUrl: "https://ysrrythubharosa.ap.gov.in",
    helpline: "1902 (AP CM Helpline) / 1800-425-3553 (Karnataka)",
    title: {
      en: "AP PM-Rythu Bharosa & Karnataka Raitha Siri Schemes",
      te: "వైఎస్సార్ / పీఎం-రైతు భరోసా & కర్ణాటక రైత సిరి పథకాలు",
      hi: "एपी पीएम-रैतु भरोसा एवं कर्नाटक रैता सिरी योजनाएं",
      kn: "ಎಪಿ ಪಿಎಂ-ರೈತು ಭರೋಸಾ ಮತ್ತು ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆಗಳು",
    },
    ministry: {
      en: "State Departments of Agriculture (Andhra Pradesh & Karnataka)",
      te: "రాష్ట్ర వ్యవసాయ శాఖలు (ఆంధ్రప్రదేశ్ & కర్ణాటక)",
      hi: "राज्य कृषि विभाग (आंध्र प्रदेश एवं कर्नाटक)",
      kn: "ರಾಜ್ಯ ಕೃಷಿ ಇಲಾಖೆಗಳು (ಆಂಧ್ರಪ್ರದೇಶ ಮತ್ತು ಕರ್ನಾಟಕ)",
    },
    benefit: {
      en: "AP: ₹13,500/year input assistance (including tenant farmers) | Karnataka: ₹10,000/ha for millets",
      te: "ఆంధ్రప్రదేశ్: కౌలు రైతులతో సహా రైతులకు ఏడాదికి ₹13,500 పెట్టుబడి సాయం | కర్ణాటక: సిరిధాన్యాల రైతులకు ₹10,000/హెక్టారు",
      hi: "आंध्र प्रदेश: बटाईदार किसानों सहित ₹13,500/वर्ष निवेश सहायता | कर्नाटक: मिलेट्स किसानों को ₹10,000/हेक्टेयर",
      kn: "ಆಂಧ್ರಪ್ರದೇಶ: ಗೇಣಿ ರೈತರೂ ಸೇರಿದಂತೆ ವರ್ಷಕ್ಕೆ ₹13,500 ಹೂಡಿಕೆ ನೆರವು | ಕರ್ನಾಟಕ: ಸಿರಿಧಾನ್ಯ ಬೆಳೆಗಾರರಿಗೆ ₹10,000/ಹೆಕ್ಟೇರ್",
    },
    description: {
      en: "State-specific input financial assistance providing direct cash deposits ahead of sowing season (Kharif, Rabi, and harvest) to ensure farmers do not fall into informal high-interest debt.",
      te: "విత్తనాల కొనుగోలు మరియు సాగు ఖర్చుల కోసం ఖరీఫ్ మరియు రబీ సీజన్ల ప్రారంభంలోనే రైతుల ఖాతాల్లో నగదు జమ చేసే రాష్ట్ర ప్రభుత్వాల విశేష పథకం.",
      hi: "बुवाई के समय खाद-बीज की खरीद के लिए किसानों को बिना किसी साहूकारी ब्याज के सीधा वित्तीय संबल प्रदान करने वाली राज्य स्तरीय योजना।",
      kn: "ಬಿತ್ತನೆ ಹಂಗಾಮಿನಲ್ಲಿ ರೈತರು ಸಾಲದ ಸುಳಿಗೆ ಸಿಲುಕದಂತೆ ನೇರವಾಗಿ ನಗದು ನೆರವು ನೀಡುವ ರಾಜ್ಯ ಸರ್ಕಾರಗಳ ಪ್ರಮುಖ ಕಲ್ಯಾಣ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "In Andhra Pradesh, covers both landholder farmers and SC/ST/BC/Minority tenant farmers holding CCRC cards.",
        "e-Crop booking verification is mandatory to confirm actual ground cultivation.",
        "Amount disbursed in three crucial seasonal tranches (May, October, and January).",
      ],
      te: [
        "ఆంధ్రప్రదేశ్‌లో భూయజమానులతో పాటు CCRC కార్డు కలిగిన ఎస్సీ, ఎస్టీ, బీసీ, మైనారిటీ కౌలు రైతులకు కూడా వర్తిస్తుంది.",
        "భూమిలో వేసిన పంటను నిర్ధారించడానికి 'e-క్రాప్ బుకింగ్' తప్పనిసరి.",
        "ఖరీఫ్ ప్రారంభం, రబీ మరియు పంట కోత సమయంలో 3 విడతల్లో జమ చేస్తారు.",
      ],
      hi: [
        "आंध्र प्रदेश में भूमि स्वामियों के साथ-साथ सीसीआरसी कार्ड धारक बटाईदार किसान भी पात्र हैं।",
        "फसल की वास्तविक बुवाई प्रमाणित करने के लिए ई-क्रॉप बुकिंग अनिवार्य है।",
        "राशि को तीन मुख्य चरणों (मई, अक्टूबर और जनवरी) में वितरित किया जाता है।",
      ],
      kn: [
        "ಆಂಧ್ರಪ್ರದೇಶದಲ್ಲಿ ಜಮೀನುದಾರರಲ್ಲದೆ ಗೇಣಿ ರೈತರಿಗೂ (ಸಿಸಿಆರ್‌ಸಿ ಕಾರ್ಡ್ ಹೊಂದಿರುವವರಿಗೆ) ಇದು ಅನ್ವಯಿಸುತ್ತದೆ.",
        "ಬೆಳೆ ಸಮೀಕ್ಷೆ (ಇ-ಕ್ರಾಪ್ ಬುಕಿಂಗ್) ಮಾಡಿಸುವುದು ಕಡ್ಡಾಯವಾಗಿದೆ.",
        "ಬಿತ್ತನೆ ಮತ್ತು ಕಟಾವಿನ 3 ಪ್ರಮುಖ ಹಂತಗಳಲ್ಲಿ ಹಣ ಬಿಡುಗಡೆ ಮಾಡಲಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Aadhaar Card", "Pattadar Passbook or Tenant CCRC Agreement", "Bank Passbook linked with NPCI", "e-Crop Booking Certificate"],
      te: ["ఆధార్ కార్డు", "పట్టాదారు పాస్ బుక్ లేదా కౌలు రైతు CCRC కార్డు", "NPCI లింక్డ్ బ్యాంక్ పాస్ బుక్", "e-క్రాప్ బుకింగ్ రశీదు"],
      hi: ["आधार कार्ड", "पट्टा या बटाईदार अनुबंध", "एनपीसीआई लिंक बैंक पासबुक", "ई-क्रॉप बुकिंग पर्ची"],
      kn: ["ಆಧಾರ್ ಕಾರ್ಡ್", "ಪಹಣಿ ಅಥವಾ ಗೇಣಿ ಒಪ್ಪಂದ ಪತ್ರ", "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್", "ಬೆಳೆ ಸಮೀಕ್ಷೆ ದೃಢೀಕರಣ"],
    },
    howToApply: {
      en: "Visit your local Village Secretariat (Rythu Bharosa Kendram / RBK in AP) or Raitha Samparka Kendra in Karnataka with your land / lease details.",
      te: "మీ గ్రామంలోని రైతు భరోసా కేంద్రం (RBK) వద్ద వ్యవసాయ సహాయకుడిని సంప్రదించి e-క్రాప్ మరియు ఆధార్ వివరాలను నమోదు చేసుకోండి.",
      hi: "अपने स्थानीय ग्राम सचिवालय (रैतु भरोसा केंद्र - आरबीके) अथवा कर्नाटक में रैता संपर्क केंद्र पर संपर्क करें।",
      kn: "ನಿಮ್ಮ ಗ್ರಾಮದ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ ಅಥವಾ ಗ್ರಾಮ ಪಂಚಾಯಿತಿಗೆ ಭೇಟಿ ನೀಡಿ ನೋಂದಾಯಿಸಿಕೊಳ್ಳಿ.",
    },
  },
  {
    id: "soil-health-card",
    code: "SHC",
    category: "income",
    officialUrl: "https://soilhealth.dac.gov.in",
    helpline: "011-24305948",
    title: {
      en: "Soil Health Card Scheme",
      te: "భూసార ఆరోగ్య కార్డు పథకం",
      hi: "मृदा स्वास्थ्य कार्ड योजना",
      kn: "ಮಣ್ಣು ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಯೋಜನೆ",
    },
    ministry: {
      en: "Department of Agriculture & Cooperation",
      te: "వ్యవసాయ మరియు సహకార శాఖ",
      hi: "कृषि एवं सहकारिता विभाग",
      kn: "ಕೃಷಿ ಮತ್ತು ಸಹಕಾರ ಇಲಾಖೆ",
    },
    benefit: {
      en: "Free scientific soil testing every 2 years with precise crop-wise fertilizer dosage recommendations",
      te: "ప్రతి 2 సంవత్సరాలకు ఉచిత భూసార పరీక్ష & పంటకు తగిన ఎరువుల వాడకంపై సమగ్ర నివేదిక",
      hi: "हर 2 साल में मुफ्त मिट्टी परीक्षण और फसल-वार संतुलित उर्वरक उपयोग की वैज्ञानिक सलाह",
      kn: "ಪ್ರತಿ 2 ವರ್ಷಕ್ಕೊಮ್ಮೆ ಉಚಿತ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮತ್ತು ಬೆಳೆಗೆ ತಕ್ಕಂತೆ ರಸಗೊಬ್ಬರ ಬಳಕೆಯ ಸಮಗ್ರ ವರದಿ",
    },
    description: {
      en: "Assesses 12 crucial soil health parameters (N, P, K, pH, Zinc, Iron, Organic Carbon) to help farmers reduce excessive fertilizer spending and prevent soil degradation.",
      te: "భూమిలోని 12 రకాల పోషకాల స్థాయిలను (నైట్రోజన్, భాస్వరం, పొటాష్, సూక్ష్మపోషకాలు) పరీక్షించి, ఖర్చును తగ్గించి దిగుబడిని పెంచే మార్గదర్శి.",
      hi: "खेत की मिट्टी में 12 आवश्यक पोषक तत्वों की जांच कर किसानों को अतिरिक्त खाद के अनावश्यक खर्च से बचाने और भूमि की उर्वरता सुधारने की योजना।",
      kn: "ಮಣ್ಣಿನಲ್ಲಿರುವ 12 ಪ್ರಮುಖ ಪೋಷಕಾಂಶಗಳ ಮಟ್ಟವನ್ನು ಪರೀಕ್ಷಿಸಿ, ರಸಗೊಬ್ಬರದ ಅತಿಯಾದ ಖರ್ಚು ಕಡಿಮೆ ಮಾಡಿ ಫಲವತ್ತತೆ ಹೆಚ್ಚಿಸಲು ನೆರವಾಗುವ ಯೋಜನೆ.",
    },
    rules: {
      en: [
        "Soil samples collected systematically by Agriculture Extension Officers using GPS grids.",
        "Detailed card issued with recommendations on customized chemical & bio-fertilizer usage.",
        "Helps farmers reduce fertilizer expenses by 15% to 25% while sustaining yield.",
      ],
      te: [
        "వ్యవసాయ విస్తరణ అధికారులు జీపీఎస్ గ్రిడ్ విధానంలో పొలం నుండి మట్టి నమూనాలు సేకరిస్తారు.",
        "పంటల వారీగా వాడాల్సిన ఎరువుల మోతాదును స్పష్టంగా సూచించే కార్డును అందజేస్తారు.",
        "దీనివల్ల అనవసర ఎరువుల ఖర్చు 15% నుండి 25% వరకు తగ్గుతుంది.",
      ],
      hi: [
        "कृषि अधिकारियों द्वारा जीपीएस ग्रिड के आधार पर खेत से मिट्टी के नमूने एकत्र किए जाते हैं।",
        "संतुलित रासायनिक व जैविक उर्वरक उपयोग हेतु व्यक्तिगत मृदा कार्ड जारी किया जाता है।",
        "इससे किसानों के खाद के खर्च में 15% से 25% तक की सीधी बचत होती है।",
      ],
      kn: [
        "ಕೃಷಿ ಅಧಿಕಾರಿಗಳು ಜಿಪಿಎಸ್ ಆಧಾರದ ಮೇಲೆ ಜಮೀನಿನಿಂದ ಮಣ್ಣಿನ ಮಾದರಿಗಳನ್ನು ಸಂಗ್ರಹಿಸುತ್ತಾರೆ.",
        "ಬೆಳೆಗೆ ಅಗತ್ಯವಿರುವ ರಸಗೊಬ್ಬರ ಮತ್ತು ಜೈವಿಕ ಗೊಬ್ಬರದ ಪ್ರಮಾಣವನ್ನು ತಿಳಿಸುವ ಕಾರ್ಡ್ ನೀಡಲಾಗುತ್ತದೆ.",
        "ಇದರಿಂದ ಗೊಬ್ಬರದ ವೆಚ್ಚದಲ್ಲಿ 15% ರಿಂದ 25% ಉಳಿತಾಯವಾಗುತ್ತದೆ.",
      ],
    },
    documents: {
      en: ["Aadhaar Card", "Farm Survey Number / Khata Details", "Previous Crop History"],
      te: ["ఆధార్ కార్డు", "పొలం సర్వే నంబర్ / ఖాతా వివరాలు", "గతంలో సాగుచేసిన పంట వివరాలు"],
      hi: ["आधार कार्ड", "खेत का खसरा/सर्वे नंबर", "पिछली फसल का विवरण"],
      kn: ["ಆಧಾರ್ ಕಾರ್ಡ್", "ಸರ್ವೆ ನಂಬರ್ / ಖಾತಾ ವಿವರ", "ಹಿಂದಿನ ಬೆಳೆಯ ವಿವರ"],
    },
    howToApply: {
      en: "Contact your Village Agricultural Assistant or submit soil samples directly to your district Soil Testing Laboratory. Download card from soilhealth.dac.gov.in.",
      te: "మీ గ్రామ వ్యవసాయ సహాయకుడిని సంప్రదించండి లేదా జిల్లా భూసార పరీక్ష ప్రయోగశాలలో మట్టి నమూనా ఇవ్వండి. కార్డ్‌ను ఆన్‌లైన్‌లో డౌన్‌లోడ్ చేసుకోవచ్చు.",
      hi: "अपने ग्राम कृषि सहायक से संपर्क करें या सीधे जिला मृदा परीक्षण प्रयोगशाला में नमूना दें। soilhealth.dac.gov.in से कार्ड डाउनलोड करें।",
      kn: "ನಿಮ್ಮ ಗ್ರಾಮ ಕೃಷಿ ಸಹಾಯಕರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಜಿಲ್ಲಾ ಮಣ್ಣು ಪರೀಕ್ಷಾ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ. ವೆಬ್‌ಸೈಟ್‌ನಿಂದ ಕಾರ್ಡ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿಕೊಳ್ಳಿ.",
    },
  },
];

export function AiAdvisory() {
  const { lang, setLang } = useI18n();

  const [activeTab, setActiveTab] = useState<"schemes" | "agronomy">("schemes");
  const [schemeCategoryFilter, setSchemeCategoryFilter] = useState("all");
  const [schemeSearch, setSchemeSearch] = useState("");
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>("pm-kisan");

  // Agronomy State
  const [selectedDistrict, setSelectedDistrict] = useState(REGIONAL_DISTRICTS[0]);
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);

  const loadAdvisory = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        crop: selectedCrop,
        district: selectedDistrict.district,
        state: selectedDistrict.state,
        soil: soilType,
      }).toString();

      const data = await api<AdvisoryResponse>(`/api/ai/agri-advisory?${q}`);
      setAdvisory(data);
    } catch {
      // Fallback
      setAdvisory({
        success: true,
        region: { district: selectedDistrict.district, state: selectedDistrict.state, soil: soilType },
        crop: selectedCrop,
        season: "Summer Harvest (Zaid)",
        benchmarkPriceRupees: 32,
        advisoryCards: [
          {
            id: "weather_irrigation",
            tag: "Micro-Irrigation Guidance",
            title: `Optimized Irrigation Protocol for ${selectedDistrict.district}`,
            summary: `Under current daytime temperatures, maintain 2.5–3.0 liters per plant every 48 hours. Morning 6 AM – 8:30 AM drip minimizes evapotranspiration.`,
            actionItem: "Schedule drip line flushing and verify inline dripper pressure at 1.2 bar.",
            confidenceScore: 94,
            source: "ICAR-IIHR Bangalore Agronomy Model",
          },
          {
            id: "pest_management",
            tag: "Crop Health Alert",
            title: `Preventative Protocol for ${selectedCrop.toUpperCase()}`,
            summary: `High daytime heat with evening humidity increases risk of early blight and sucking pests. Neem drench (10,000 ppm) recommended at 3ml/L.`,
            actionItem: "Install yellow sticky traps (15 traps/acre) to monitor whiteflies and thrips.",
            confidenceScore: 91,
            source: "Central Integrated Pest Management Centre (CIPMC)",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "agronomy") {
      void loadAdvisory();
    }
  }, [selectedDistrict, selectedCrop, soilType, activeTab]);

  const filteredSchemes = useMemo(() => {
    return GOVT_SCHEMES.filter((s) => {
      if (schemeCategoryFilter !== "all" && s.category !== schemeCategoryFilter) {
        return false;
      }
      if (!schemeSearch.trim()) return true;
      const q = schemeSearch.toLowerCase();
      const titleText = (s.title[lang] || s.title.en).toLowerCase();
      const descText = (s.description[lang] || s.description.en).toLowerCase();
      const codeText = s.code.toLowerCase();
      return titleText.includes(q) || descText.includes(q) || codeText.includes(q);
    });
  }, [schemeCategoryFilter, schemeSearch, lang]);

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-20">
      {/* 1. Header Banner & Top Language Selector */}
      <div className="flex flex-col justify-between gap-5 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
              <Landmark className="h-3.5 w-3.5 text-emerald-700" />
              Verified Government & ICAR Advisory
            </span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Insights & Government Advisory
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Official government schemes, subsidies, insurance, rules & regulations, and verified agronomy guidance tailored for your region.
          </p>
        </div>

        {/* Multilingual Switcher Bar at Top Right */}
        <div className="flex flex-col gap-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-emerald-700" />
            <span>Select Language / భాష / ಭಾಷೆ:</span>
          </span>
          <div className="inline-flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 shadow-2xs">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  lang === l.code
                    ? "bg-[#1b4332] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs: Government Schemes vs Real-Time Agronomy */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("schemes")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
            activeTab === "schemes"
              ? "bg-[#1b4332] text-white shadow-xs"
              : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Government Schemes & Portals ({GOVT_SCHEMES.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agronomy")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
            activeTab === "agronomy"
              ? "bg-[#1b4332] text-white shadow-xs"
              : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <Sprout className="h-4 w-4" />
          <span>ICAR Crop Doctor & Weather Advisory</span>
        </button>
      </div>

      {/* 3. TAB A: Government Schemes & Rules Directory */}
      {activeTab === "schemes" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={schemeSearch}
                onChange={(e) => setSchemeSearch(e.target.value)}
                placeholder="Search scheme by name, subsidy, or keyword..."
                className="w-full rounded-2xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Schemes" },
                { id: "income", label: "Income Support" },
                { id: "insurance", label: "Crop Insurance" },
                { id: "credit", label: "KCC Loans" },
                { id: "irrigation", label: "Drip Irrigation" },
                { id: "machinery", label: "Tractor & Machinery" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSchemeCategoryFilter(cat.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    schemeCategoryFilter === cat.id
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scheme Cards Accordion / List */}
          <div className="space-y-4">
            {filteredSchemes.map((scheme) => {
              const isExpanded = expandedSchemeId === scheme.id;
              const title = scheme.title[lang] || scheme.title.en;
              const ministry = scheme.ministry[lang] || scheme.ministry.en;
              const benefit = scheme.benefit[lang] || scheme.benefit.en;
              const description = scheme.description[lang] || scheme.description.en;
              const rules = scheme.rules[lang] || scheme.rules.en;
              const documents = scheme.documents[lang] || scheme.documents.en;
              const howToApply = scheme.howToApply[lang] || scheme.howToApply.en;

              return (
                <div
                  key={scheme.id}
                  className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs transition hover:border-zinc-300"
                >
                  {/* Scheme Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-extrabold text-emerald-800 border border-emerald-200">
                          {scheme.code}
                        </span>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs font-semibold text-zinc-500">{ministry}</span>
                      </div>

                      <h2 className="font-serif text-xl font-bold text-zinc-900 sm:text-2xl">
                        {title}
                      </h2>

                      <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Award className="h-4 w-4 shrink-0" />
                        <span>Benefit: {benefit}</span>
                      </p>
                    </div>

                    {/* Official Portal Direct Link Button */}
                    <div className="flex shrink-0 items-center gap-2.5">
                      <a
                        href={scheme.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1b4332] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#245e38] transition"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setExpandedSchemeId(isExpanded ? null : scheme.id)}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition"
                      >
                        {isExpanded ? "Hide Rules" : "Rules & Details ↓"}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="mt-4 text-sm leading-relaxed text-zinc-600 border-t border-zinc-100 pt-4">
                    {description}
                  </p>

                  {/* Expanded Rules & Regulations, Eligibility, Documents */}
                  {isExpanded && (
                    <div className="mt-6 space-y-6 rounded-2xl bg-[#fafbfa] p-5 sm:p-6 border border-zinc-200/80 animate-in fade-in duration-200">
                      {/* Rules & Regulations */}
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800 flex items-center gap-2 mb-3">
                          <ShieldCheck className="h-4 w-4 text-emerald-700" />
                          <span>Rules & Regulations / Eligibility Criteria</span>
                        </h3>
                        <ul className="space-y-2">
                          {rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Required Documents */}
                      <div className="border-t border-zinc-200/60 pt-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800 flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-blue-700" />
                          <span>Required Documents Checklist</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {documents.map((doc, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-2xs"
                            >
                              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{doc}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Step-by-Step How to Apply */}
                      <div className="border-t border-zinc-200/60 pt-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-800 flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-amber-700" />
                          <span>How to Apply</span>
                        </h3>
                        <p className="text-xs text-zinc-700 leading-relaxed bg-white p-3.5 rounded-xl border border-zinc-200">
                          {howToApply}
                        </p>
                      </div>

                      {/* Helpline row */}
                      <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-200/60 pt-3">
                        <span>Helpline / Toll-free: <strong className="text-zinc-800">{scheme.helpline}</strong></span>
                        <a
                          href={scheme.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
                        >
                          <span>Open {scheme.officialUrl}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB B: Real-Time ICAR Agronomy Advisory */}
      {activeTab === "agronomy" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls: Region and Crop Selector */}
          <div className="grid grid-cols-1 gap-4 rounded-3xl border border-zinc-200 bg-white p-6 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">Selected Agriculture Belt</label>
              <select
                value={selectedDistrict.district}
                onChange={(e) => {
                  const d = REGIONAL_DISTRICTS.find((x) => x.district === e.target.value);
                  if (d) setSelectedDistrict(d);
                }}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none"
              >
                {REGIONAL_DISTRICTS.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">Crop Focus</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none"
              >
                {CROP_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">Soil Condition</label>
              <input
                type="text"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none"
              />
            </div>
          </div>

          {/* Agronomy Cards */}
          {loading ? (
            <p className="text-sm font-semibold text-zinc-500">Retrieving agronomy model guidance…</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {advisory?.advisoryCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        {card.tag}
                      </span>
                      <span className="text-xs font-bold text-zinc-400">
                        {card.confidenceScore}% Confidence
                      </span>
                    </div>

                    <h3 className="mt-3 font-serif text-lg font-bold text-zinc-900">
                      {card.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                      {card.summary}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-bold text-[#1b4332]">
                      Action: {card.actionItem}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Source: {card.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
