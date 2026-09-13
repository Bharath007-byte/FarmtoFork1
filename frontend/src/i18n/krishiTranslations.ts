import type { AppLang } from "./index";

export interface KrishiStudioTranslations {
  krishiAiAgronomist: string;
  organicProtocolSmartPlanner: string;
  studioTitle: string;
  tabPlanner: string;
  tabDoctor: string;
  tabCalendar: string;

  // Masterplanner Inputs
  selectFarmland: string;
  flexiblePlanning: string;
  selectedSize: string;
  acres: string;
  acre: string;
  quickPresets: string;
  smallholderLabel: string;
  tenAcres: string;
  twentyFiveAcres: string;
  largeFarmLabel: string;
  primaryCrop: string;
  soilType: string;
  waterSource: string;

  // Options
  cropTomato: string;
  cropChilli: string;
  cropOnion: string;
  cropPaddy: string;
  cropCotton: string;

  soilRedSandyLoam: string;
  soilBlackCotton: string;
  soilClayLoam: string;
  soilAlluvial: string;

  waterBorewellSolar: string;
  waterCanal: string;
  waterOpenWell: string;
  waterRainfedPond: string;

  calculatingPlan: string;

  // KPI cards
  projectedHarvest: string;
  tonnes: string;
  totalAcreageSuffix: string;
  estimatedCost: string;
  lakhs: string;
  costSubtext: string;
  directMarketValue: string;
  directToConsumerBonus: string;
  netEstimatedProfit: string;
  roiLabel: string;

  // Land Parcel Breakdown
  landParcelBreakdown: string;
  totalText: string;

  // Input quantities
  requiredInputsFor: string;
  fymManure: string;
  tons: string;
  jeevamrutMo: string;
  litersAbbr: string;
  certifiedSeed: string;
  kgAbbr: string;
  dripLateral: string;
  kmAbbr: string;
  waterBudget: string;
  klPerDay: string;

  // Nutrition Schedule
  organicNutritionSchedule: string;

  // Crop Doctor
  leafCropPhoto: string;
  clickToUpload: string;
  changePhoto: string;
  samplesLabel: string;
  sampleTomatoBlight: string;
  sampleTomatoCurl: string;
  sampleChilliAnthracnose: string;
  describeSymptoms: string;
  symptomsPlaceholder: string;
  diagnoseBtn: string;
  analyzingText: string;
  detectedLabel: string;
  matchText: string;
  prescribedTreatments: string;
  doseLabel: string;
  severeSeverity: string;
  moderateSeverity: string;
  mildSeverity: string;

  // Sowing Calendar
  loadingCalendar: string;
  seasonLabel: string;
  maturityLabel: string;
  daysText: string;
  sowingWindow: string;
  transplantingWindow: string;
  harvestingWindow: string;
  lifecycleMilestones: string;
}

export const KRISHI_TRANSLATIONS: Record<AppLang, KrishiStudioTranslations> = {
  en: {
    krishiAiAgronomist: "Krishi AI Agronomist",
    organicProtocolSmartPlanner: "Organic Protocol & Smart Planner",
    studioTitle: "Farm Doctor & Architecture Studio",
    tabPlanner: "Farm Masterplanner (1–50+ Acres)",
    tabDoctor: "Crop Doctor & Organic Cures",
    tabCalendar: "When to Cultivate (Sowing Calendar)",

    selectFarmland: "Select Farmland Area & Preferences",
    flexiblePlanning: "Flexible planning for small plots and large acreage (1 to 50+ Acres)",
    selectedSize: "Selected Size:",
    acres: "Acres",
    acre: "Acre",
    quickPresets: "Quick Presets",
    smallholderLabel: "1 Acre (Smallholder / Plot)",
    tenAcres: "10 Acres",
    twentyFiveAcres: "25 Acres",
    largeFarmLabel: "50 Acres (Large Farm)",
    primaryCrop: "Primary Crop",
    soilType: "Soil Type",
    waterSource: "Water Source",

    cropTomato: "Tomato (Commercial Hybrid)",
    cropChilli: "Green Chilli (G4 / Teja)",
    cropOnion: "Onion (Nashik Red)",
    cropPaddy: "Paddy / Rice (Sona Masoori)",
    cropCotton: "Cotton (Medium Staple)",

    soilRedSandyLoam: "Red Sandy Loam",
    soilBlackCotton: "Black Cotton Soil",
    soilClayLoam: "Clay Loam",
    soilAlluvial: "Alluvial Soil",

    waterBorewellSolar: "Borewell with Solar Drip",
    waterCanal: "Canal Irrigation",
    waterOpenWell: "Open Well & Micro-Drip",
    waterRainfedPond: "Rainfed Farm Pond",

    calculatingPlan: "Calculating acreage allocation and yields...",

    projectedHarvest: "Projected Harvest",
    tonnes: "Tonnes",
    totalAcreageSuffix: "total",
    estimatedCost: "Estimated Cost",
    lakhs: "Lakhs",
    costSubtext: "Seeds, organic inputs, drip",
    directMarketValue: "Direct Market Value",
    directToConsumerBonus: "+18% Direct Direct-to-Consumer",
    netEstimatedProfit: "Net Estimated Profit",
    roiLabel: "ROI:",

    landParcelBreakdown: "Land Parcel Breakdown",
    totalText: "Total",

    requiredInputsFor: "Required Inputs for",
    fymManure: "FYM Manure",
    tons: "Tons",
    jeevamrutMo: "Jeevamrut / Mo",
    litersAbbr: "L",
    certifiedSeed: "Certified Seed",
    kgAbbr: "Kg",
    dripLateral: "Drip Lateral",
    kmAbbr: "Km",
    waterBudget: "Water Budget",
    klPerDay: "KL/Day",

    organicNutritionSchedule: "Organic Feeding & Nutrition Schedule",

    leafCropPhoto: "Leaf / Crop Photo",
    clickToUpload: "Click to upload or take photo",
    changePhoto: "Change",
    samplesLabel: "Samples:",
    sampleTomatoBlight: "Tomato Blight",
    sampleTomatoCurl: "Tomato Leaf Curl",
    sampleChilliAnthracnose: "Chilli Anthracnose",
    describeSymptoms: "Describe Visible Symptoms",
    symptomsPlaceholder: "e.g. yellow leaf margins, brown concentric spots, fruit rot...",
    diagnoseBtn: "Diagnose & Prescribe",
    analyzingText: "Analyzing...",
    detectedLabel: "Detected",
    matchText: "Match",
    prescribedTreatments: "Prescribed Organic Treatments & Store Products",
    doseLabel: "Dose:",
    severeSeverity: "Severe",
    moderateSeverity: "Moderate",
    mildSeverity: "Mild",

    loadingCalendar: "Loading sowing calendar...",
    seasonLabel: "Season:",
    maturityLabel: "Maturity:",
    daysText: "days",
    sowingWindow: "Sowing Window",
    transplantingWindow: "Transplanting",
    harvestingWindow: "Harvesting",
    lifecycleMilestones: "Lifecycle Milestones",
  },

  te: {
    krishiAiAgronomist: "కృషి AI వ్యవసాయ నిపుణుడు",
    organicProtocolSmartPlanner: "సేంద్రీయ విధానం & స్మార్ట్ ప్లానర్",
    studioTitle: "పంట సంరక్షణ & వ్యవసాయ ప్రణాళిక స్టూడియో",
    tabPlanner: "వ్యవసాయ మాస్టర్‌ప్లానర్ (1–50+ ఎకరాలు)",
    tabDoctor: "పంట డాక్టర్ & సేంద్రీయ నివారణలు",
    tabCalendar: "ఎప్పుడు సాగు చేయాలి (విత్తే క్యాలెండర్)",

    selectFarmland: "పొలం విస్తీర్ణం & ప్రాధాన్యతలను ఎంచుకోండి",
    flexiblePlanning: "చిన్న కమతాల నుండి పెద్ద విస్తీర్ణం వరకు అనువైన ప్రణాళిక (1 నుండి 50+ ఎకరాలు)",
    selectedSize: "ఎంచుకున్న విస్తీర్ణం:",
    acres: "ఎకరాలు",
    acre: "ఎకరం",
    quickPresets: "త్వరిత ఎంపికలు",
    smallholderLabel: "1 ఎకరం (చిన్న రైతు / ప్లాట్)",
    tenAcres: "10 ఎకరాలు",
    twentyFiveAcres: "25 ఎకరాలు",
    largeFarmLabel: "50 ఎకరాలు (పెద్ద పొలం)",
    primaryCrop: "ప్రధాన పంట",
    soilType: "నేల రకం",
    waterSource: "నీటి వనరు",

    cropTomato: "టమోటా (హైబ్రిడ్ రకం)",
    cropChilli: "పచ్చిమిర్చి (తేజ / G4)",
    cropOnion: "ఉల్లిపాయ (నాసిక్ రెడ్)",
    cropPaddy: "వరి / ధాన్యం (సోనా మసూరి)",
    cropCotton: "పత్తి (మధ్యస్థ నాణ్యత)",

    soilRedSandyLoam: "ఎర్ర ఇసుక నేల",
    soilBlackCotton: "నల్లరేగడి నేల",
    soilClayLoam: "బంకమట్టి నేల",
    soilAlluvial: "ఒండ్రు మట్టి నేల",

    waterBorewellSolar: "బోరుబావి & సోలార్ డ్రిప్",
    waterCanal: "కాలువ నీటిపారుదల",
    waterOpenWell: "తెరిచిన బావి & మైక్రో-డ్రిప్",
    waterRainfedPond: "వర్షాధార & వ్యవసాయ కుంట",

    calculatingPlan: "విస్తీర్ణ కేటాయింపు మరియు దిగుబడి లెక్కింపు జరుగుతోంది...",

    projectedHarvest: "అంచనా దిగుబడి",
    tonnes: "టన్నులు",
    totalAcreageSuffix: "మొత్తం",
    estimatedCost: "అంచనా ఖర్చు",
    lakhs: "లక్షలు",
    costSubtext: "విత్తనాలు, సేంద్రీయ ఎరువులు, డ్రిప్",
    directMarketValue: "నేరుగా మార్కెట్ విలువ",
    directToConsumerBonus: "+18% వినియోగదారులకు నేరుగా అమ్మడం ద్వారా లాభం",
    netEstimatedProfit: "నికర అంచనా లాభం",
    roiLabel: "పెట్టుబడిపై లాభం (ROI):",

    landParcelBreakdown: "భూమి కేటాయింపు మరియు విభజన",
    totalText: "మొత్తం",

    requiredInputsFor: "అవసరమైన సాగు ఉత్పాదకాలు (విస్తీర్ణం:",
    fymManure: "పశువుల పేడ ఎరువు (FYM)",
    tons: "టన్నులు",
    jeevamrutMo: "జీవామృతం / నెలకు",
    litersAbbr: "లీటర్లు",
    certifiedSeed: "నాణ్యమైన విత్తనాలు",
    kgAbbr: "కిలోలు",
    dripLateral: "డ్రిప్ పైపుల పొడవు",
    kmAbbr: "కి.మీ",
    waterBudget: "నీటి అవసరం",
    klPerDay: "కి.లీ / రోజుకు",

    organicNutritionSchedule: "సేంద్రీయ పోషకాల నిర్వహణ ప్రణాళిక",

    leafCropPhoto: "ఆకు / పంట ఫోటో",
    clickToUpload: "ఫోటో అప్‌లోడ్ చేయడానికి లేదా తీయడానికి క్లిక్ చేయండి",
    changePhoto: "మార్చండి",
    samplesLabel: "నమూనాలు:",
    sampleTomatoBlight: "టమోటా ఆకుమచ్చ",
    sampleTomatoCurl: "టమోటా ఆకుముడత",
    sampleChilliAnthracnose: "మిర్చి కాయకుళ్లు తెగులు",
    describeSymptoms: "కనిపించే తెగులు లక్షణాలను వివరించండి",
    symptomsPlaceholder: "ఉదా: ఆకులు పసుపు రంగులోకి మారడం, గోధుమ మచ్చలు, కాయ కుళ్లు...",
    diagnoseBtn: "వ్యాధి నిర్ధారణ & సేంద్రీయ చికిత్స",
    analyzingText: "విశ్లేషిస్తోంది...",
    detectedLabel: "గుర్తించిన తెగులు",
    matchText: "సరిపోలిక",
    prescribedTreatments: "సూచించిన సేంద్రీయ నివారణలు & ఉత్పత్తులు",
    doseLabel: "మోతాదు:",
    severeSeverity: "తీవ్రమైనది",
    moderateSeverity: "మధ్యస్థం",
    mildSeverity: "సాధారణం",

    loadingCalendar: "విత్తే క్యాలెండర్ లోడ్ అవుతోంది...",
    seasonLabel: "సీజన్:",
    maturityLabel: "పంట కాలం:",
    daysText: "రోజులు",
    sowingWindow: "విత్తనాలు వేసే సమయం",
    transplantingWindow: "నాట్లు వేసే సమయం",
    harvestingWindow: "పంట కోత సమయం",
    lifecycleMilestones: "పంట ఎదుగుదల దశలు & తీసుకోవాల్సిన చర్యలు",
  },

  hi: {
    krishiAiAgronomist: "कृषि एआई कृषि विशेषज्ञ",
    organicProtocolSmartPlanner: "जैविक प्रोटोकॉल एवं स्मार्ट योजनाकार",
    studioTitle: "फार्म डॉक्टर एवं कृषि संरचना स्टूडियो",
    tabPlanner: "फार्म मास्टरप्लानर (1–50+ एकड़)",
    tabDoctor: "फसल डॉक्टर एवं जैविक उपचार",
    tabCalendar: "कब करें खेती (बुवाई कैलेंडर)",

    selectFarmland: "कृषि भूमि क्षेत्र एवं प्राथमिकताएं चुनें",
    flexiblePlanning: "छोटे भूखंडों और बड़े रकबे के लिए लचीली योजना (1 से 50+ एकड़)",
    selectedSize: "चुना हुआ आकार:",
    acres: "एकड़",
    acre: "एकड़",
    quickPresets: "त्वरित विकल्प",
    smallholderLabel: "1 एकड़ (छोटे किसान / भूखंड)",
    tenAcres: "10 एकड़",
    twentyFiveAcres: "25 एकड़",
    largeFarmLabel: "50 एकड़ (बड़ा खेत)",
    primaryCrop: "मुख्य फसल",
    soilType: "मिट्टी का प्रकार",
    waterSource: "पानी का स्रोत",

    cropTomato: "टमाटर (हाइब्रिड)",
    cropChilli: "हरी मिर्च (तेजा / G4)",
    cropOnion: "प्याज (नासिक लाल)",
    cropPaddy: "धान / चावल (सोना मसूरी)",
    cropCotton: "कपास (मीडियम स्टेपल)",

    soilRedSandyLoam: "लाल रेतीली दोमट मिट्टी",
    soilBlackCotton: "काली कपास मिट्टी",
    soilClayLoam: "चिकनी दोमट मिट्टी",
    soilAlluvial: "जलोढ़ मिट्टी",

    waterBorewellSolar: "बोरवेल और सोलर ड्रिप",
    waterCanal: "नहर सिंचाई",
    waterOpenWell: "खुला कुआं एवं माइक्रो-ड्रिप",
    waterRainfedPond: "वर्षा आधारित कृषि तालाब",

    calculatingPlan: "रकबा आवंटन एवं उपज की गणना हो रही है...",

    projectedHarvest: "अनुमानित उपज",
    tonnes: "टन",
    totalAcreageSuffix: "कुल",
    estimatedCost: "अनुमानित लागत",
    lakhs: "लाख",
    costSubtext: "बीज, जैविक खाद, ड्रिप",
    directMarketValue: "प्रत्यक्ष बाज़ार मूल्य",
    directToConsumerBonus: "+18% सीधे उपभोक्ता बिक्री से अधिक लाभ",
    netEstimatedProfit: "शुद्ध अनुमानित लाभ",
    roiLabel: "आरओआई (ROI):",

    landParcelBreakdown: "भूमि भूखंड विभाजन एवं आवंटन",
    totalText: "कुल",

    requiredInputsFor: "आवश्यक कृषि सामग्री (रकबा:",
    fymManure: "गोबर की खाद (FYM)",
    tons: "टन",
    jeevamrutMo: "जीवामृत / माह",
    litersAbbr: "लीटर",
    certifiedSeed: "प्रमाणित बीज",
    kgAbbr: "किग्रा",
    dripLateral: "ड्रिप पाइप की लंबाई",
    kmAbbr: "किमी",
    waterBudget: "पानी की आवश्यकता",
    klPerDay: "के.एल / दिन",

    organicNutritionSchedule: "जैविक पोषण एवं खाद समय सारिणी",

    leafCropPhoto: "पत्ती / फसल की तस्वीर",
    clickToUpload: "तस्वीर अपलोड करने या लेने के लिए क्लिक करें",
    changePhoto: "बदलें",
    samplesLabel: "नमूने:",
    sampleTomatoBlight: "टमाटर अंगमारी (ब्लाइट)",
    sampleTomatoCurl: "टमाटर पर्ण कुंचन (लीफ कर्ल)",
    sampleChilliAnthracnose: "मिर्च फल सड़न / एन्थ्रेक्नोज",
    describeSymptoms: "दिखने वाले लक्षणों का विवरण दें",
    symptomsPlaceholder: "उदा. पत्तियों का पीलापन, भूरे धब्बे, फल सड़न...",
    diagnoseBtn: "रोग निदान एवं जैविक उपचार जानें",
    analyzingText: "विश्लेषण हो रहा है...",
    detectedLabel: "पहचाना गया रोग",
    matchText: "सटीकता",
    prescribedTreatments: "अनुशंसित जैविक उपचार एवं उत्पाद",
    doseLabel: "मात्रा:",
    severeSeverity: "गंभीर",
    moderateSeverity: "मध्यम",
    mildSeverity: "हल्का",

    loadingCalendar: "बुवाई कैलेंडर लोड हो रहा है...",
    seasonLabel: "मौसम:",
    maturityLabel: "परिपक्वता:",
    daysText: "दिन",
    sowingWindow: "बुवाई का समय",
    transplantingWindow: "रोपाई का समय",
    harvestingWindow: "कटाई का समय",
    lifecycleMilestones: "फसल के महत्वपूर्ण चरण एवं कार्य",
  },

  kn: {
    krishiAiAgronomist: "ಕೃಷಿ AI ಕೃಷಿ ತಜ್ಞ",
    organicProtocolSmartPlanner: "ಸಾವಯವ ಪ್ರೋಟೋಕಾಲ್ & ಸ್ಮಾರ್ಟ್ ಪ್ಲಾನರ್",
    studioTitle: "ಬೆಳೆ ವೈದ್ಯ ಮತ್ತು ಕೃಷಿ ವಾಸ್ತುಶಿಲ್ಪ ಸ್ಟುಡಿಯೋ",
    tabPlanner: "ಕೃಷಿ ಮಾಸ್ಟರ್‌ಪ್ಲಾನರ್ (1–50+ ಎಕರೆ)",
    tabDoctor: "ಬೆಳೆ ವೈದ್ಯ & ಸಾವಯವ ಚಿಕಿತ್ಸೆಗಳು",
    tabCalendar: "ಯಾವಾಗ ಕೃಷಿ ಮಾಡಬೇಕು (ಬಿತ್ತನೆ ಕ್ಯಾಲೆಂಡರ್)",

    selectFarmland: "ಕೃಷಿ ಭೂಮಿ ವಿಸ್ತೀರ್ಣ ಮತ್ತು ಆದ್ಯತೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    flexiblePlanning: "ಸಣ್ಣ ಹಿಡುವಳಿಗಳಿಂದ ಹಿಡಿದು ದೊಡ್ಡ ಜಮೀನುಗಳವರೆಗೆ ಹೊಂದಿಕೊಳ್ಳುವ ಯೋಜನೆ (1 ರಿಂದ 50+ ಎಕರೆ)",
    selectedSize: "ಆಯ್ಕೆ ಮಾಡಿದ ವಿಸ್ತೀರ್ಣ:",
    acres: "ಎಕರೆ",
    acre: "ಎಕರೆ",
    quickPresets: "ತ್ವರಿತ ಆಯ್ಕೆಗಳು",
    smallholderLabel: "1 ಎಕರೆ (ಸಣ್ಣ ಹಿಡುವಳಿ / ಪ್ಲಾಟ್)",
    tenAcres: "10 ಎಕರೆ",
    twentyFiveAcres: "25 ಎಕರೆ",
    largeFarmLabel: "50 ಎಕರೆ (ದೊಡ್ಡ ಕೃಷಿ)",
    primaryCrop: "ಮುಖ್ಯ ಬೆಳೆ",
    soilType: "ಮಣ್ಣಿನ ವಿಧ",
    waterSource: "ನೀರಿನ ಮೂಲ",

    cropTomato: "ಟೊಮ್ಯಾಟೊ (ಹೈಬ್ರಿಡ್)",
    cropChilli: "ಹಸಿರು ಮೆಣಸಿನಕಾಯಿ (ತೇಜ / G4)",
    cropOnion: "ಈರುಳ್ಳಿ (ನಾಸಿಕ್ ಕೆಂಪು)",
    cropPaddy: "ಭತ್ತ / ಅಕ್ಕಿ (ಸೋನಾ ಮಸೂರಿ)",
    cropCotton: "ಹತ್ತಿ (ಮಧ್ಯಮ ಗುಣಮಟ್ಟ)",

    soilRedSandyLoam: "ಕೆಂಪು ಮರಳು ಮಿಶ್ರಿತ ಗೋಡು ಮಣ್ಣು",
    soilBlackCotton: "ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು",
    soilClayLoam: "ಜೇಡಿಮಣ್ಣಿನ ಗೋಡು",
    soilAlluvial: "ಮೆಕ್ಕಲು ಮಣ್ಣು",

    waterBorewellSolar: "ಬೋರ್‌ವೆಲ್ ಮತ್ತು ಸೋಲಾರ್ ಹನಿ ನೀರಾವರಿ",
    waterCanal: "ಕಾಲುವೆ ನೀರಾವರಿ",
    waterOpenWell: "ತೆರೆದ ಬಾವಿ ಮತ್ತು ಮೈಕ್ರೋ-ಡ್ರಿಪ್",
    waterRainfedPond: "ಮಳೆ ಆಧಾರಿತ ಕೃಷಿ ಹೊಂಡ",

    calculatingPlan: "ವಿಸ್ತೀರ್ಣ ಹಂಚಿಕೆ ಮತ್ತು ಇಳುವರಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತಿದೆ...",

    projectedHarvest: "ನಿರೀಕ್ಷಿತ ಇಳುವರಿ",
    tonnes: "ಟನ್",
    totalAcreageSuffix: "ಒಟ್ಟು",
    estimatedCost: "ಅಂದಾಜು ವೆಚ್ಚ",
    lakhs: "ಲಕ್ಷ",
    costSubtext: "ಬೀಜಗಳು, ಸಾವಯವ ಗೊಬ್ಬರ, ಡ್ರಿಪ್",
    directMarketValue: "ನೇರ ಮಾರುಕಟ್ಟೆ ಮೌಲ್ಯ",
    directToConsumerBonus: "+18% ನೇರ ಗ್ರಾಹಕ ಮಾರಾಟದಿಂದ ಅಧಿಕ ಲಾಭ",
    netEstimatedProfit: "ನಿವ್ವಳ ಅಂದಾಜು ಲಾಭ",
    roiLabel: "ಲಾಭಾಂಶ (ROI):",

    landParcelBreakdown: "ಭೂಮಿ ವಿಭಾಗ ಮತ್ತು ಹಂಚಿಕೆ",
    totalText: "ಒಟ್ಟು",

    requiredInputsFor: "ಅಗತ್ಯ ಕೃಷಿ ಪರಿಕರಗಳು (ವಿಸ್ತೀರ್ಣ:",
    fymManure: "ಹಟ್ಟಿಗೊಬ್ಬರ (FYM)",
    tons: "ಟನ್",
    jeevamrutMo: "ಜೀವಾಮೃತ / ತಿಂಗಳಿಗೆ",
    litersAbbr: "ಲೀಟರ್",
    certifiedSeed: "ಪ್ರಮಾಣೀಕೃತ ಬೀಜಗಳು",
    kgAbbr: "ಕೆಜಿ",
    dripLateral: "ಹನಿ ನೀರಾವರಿ ಪೈಪ್ ಉದ್ದ",
    kmAbbr: "ಕಿಮೀ",
    waterBudget: "ನೀರಿನ ಅಗತ್ಯತೆ",
    klPerDay: "ಕೆ.ಎಲ್ / ದಿನಕ್ಕೆ",

    organicNutritionSchedule: "ಸಾವಯವ ಪೋಷಕಾಂಶಗಳ ವೇಳಾಪಟ್ಟಿ",

    leafCropPhoto: "ಎಲೆ / ಬೆಳೆಯ ಫೋಟೋ",
    clickToUpload: "ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಅಥವಾ ಕ್ಲಿಕ್ ಮಾಡಿ",
    changePhoto: "ಬದಲಾಯಿಸಿ",
    samplesLabel: "ಮಾದರಿಗಳು:",
    sampleTomatoBlight: "ಟೊಮ್ಯಾಟೊ ಬ್ಲೈಟ್ ರೋಗ",
    sampleTomatoCurl: "ಟೊಮ್ಯಾಟೊ ಎಲೆ ಸುರುಳಿ ರೋಗ",
    sampleChilliAnthracnose: "ಮೆಣಸಿನಕಾಯಿ ಕೊಳೆ ರೋಗ",
    describeSymptoms: "ಕಾಣಿಸುವ ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ",
    symptomsPlaceholder: "ಉದಾ: ಹಳದಿ ಎಲೆಗಳು, ಕಂದು ಚುಕ್ಕೆಗಳು, ಕಾಯಿ ಕೊಳೆ...",
    diagnoseBtn: "ರೋಗ ಪತ್ತೆ ಮತ್ತು ಸಾವಯವ ಚಿಕಿತ್ಸೆ",
    analyzingText: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    detectedLabel: "ಪತ್ತೆಯಾದ ರೋಗ",
    matchText: "ಹೊಂದಾಣಿಕೆ",
    prescribedTreatments: "ಶಿಫಾರಸು ಮಾಡಿದ ಸಾವಯವ ಚಿಕಿತ್ಸೆಗಳು & ಉತ್ಪನ್ನಗಳು",
    doseLabel: "ಪ್ರಮಾಣ:",
    severeSeverity: "ತೀವ್ರ",
    moderateSeverity: "ಮಧ್ಯಮ",
    mildSeverity: "ಸಾಮಾನ್ಯ",

    loadingCalendar: "ಬಿತ್ತನೆ ಕ್ಯಾಲೆಂಡರ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    seasonLabel: "ಋತು:",
    maturityLabel: "ಪಕ್ವತೆಯ ಅವಧಿ:",
    daysText: "ದಿನಗಳು",
    sowingWindow: "ಬಿತ್ತನೆ ಸಮಯ",
    transplantingWindow: "ನಾಟಿ ಮಾಡುವ ಸಮಯ",
    harvestingWindow: "ಕೊಯ್ಲಿನ ಸಮಯ",
    lifecycleMilestones: "ಬೆಳೆಯ ಪ್ರಮುಖ ಹಂತಗಳು ಮತ್ತು ಕೈಗೊಳ್ಳಬೇಕಾದ ಕ್ರಮಗಳು",
  },
};

/**
 * Helper to translate parcel names and dynamic descriptions
 */
export function translateParcel(
  name: string,
  purpose: string,
  irrigation: string,
  lang: AppLang
) {
  if (lang === "en") return { name, purpose, irrigation };

  if (lang === "te") {
    let tName = name;
    let tPurpose = purpose;
    let tIrrigation = irrigation;

    if (name.includes("Parcel A")) tName = name.replace("Parcel A: Primary Cash Crop", "భాగం A: ప్రధాన వాణిజ్య పంట");
    else if (name.includes("Parcel B")) tName = name.replace("Parcel B: Nitrogen-Fixing Pulses", "భాగం B: నత్రజని స్థిరీకరణ పప్పుధాన్యాలు");
    else if (name.includes("Parcel C")) tName = name.replace("Parcel C: Short-Cycle Greens & Fodder", "భాగం C: స్వల్పకాలిక ఆకుకూరలు & పశుగ్రాసం");
    else if (name.includes("Parcel D")) tName = name.replace("Parcel D: Border Trap Crops & Honeybee Corridor", "భాగం D: సరిహద్దు ఎర పంటలు & తేనెటీగల మార్గం");

    if (purpose.includes("Intensive organic cultivation")) tPurpose = "సేంద్రీయ పద్ధతిలో విస్తారమైన సాగు మరియు అధిక దిగుబడి.";
    else if (purpose.includes("Soil restoration")) tPurpose = "నేల సారాన్ని పెంచే నత్రజని స్థిరీకరణ మరియు అదనపు ఆదాయం.";
    else if (purpose.includes("Continuous weekly cashflow")) tPurpose = "రైతుకు నిరంతర వారపు ఆదాయం మరియు పాడి పశువులకు పౌష్టిక ఆహారం.";
    else if (purpose.includes("Natural pest suppression")) tPurpose = "సహజ సిద్ధమైన పురుగుల నివారణ మరియు పరాగ సంపర్కం పెంపు.";

    if (irrigation.includes("Automated drip lines")) tIrrigation = "స్వయం చాలిత సోలార్ బిందు సేద్యం (డ్రిప్)";
    else if (irrigation.includes("Micro-sprinklers")) tIrrigation = "మైక్రో-స్ప్రింక్లర్లు లేదా డ్రిప్";
    else if (irrigation.includes("Overhead misting")) tIrrigation = "తేలికపాటి చిలకరింపు లేదా తుంపర సేద్యం";
    else if (irrigation.includes("Perimeter drip buffer")) tIrrigation = "సరిహద్దు చుట్టూ డ్రిప్ లైన్లు";

    return { name: tName, purpose: tPurpose, irrigation: tIrrigation };
  }

  if (lang === "hi") {
    let tName = name;
    let tPurpose = purpose;
    let tIrrigation = irrigation;

    if (name.includes("Parcel A")) tName = name.replace("Parcel A: Primary Cash Crop", "भूखंड A: मुख्य नकदी फसल");
    else if (name.includes("Parcel B")) tName = name.replace("Parcel B: Nitrogen-Fixing Pulses", "भूखंड B: नाइट्रोजन-फिक्सिंग दलहन");
    else if (name.includes("Parcel C")) tName = name.replace("Parcel C: Short-Cycle Greens & Fodder", "भूखंड C: अल्पकालिक हरी सब्जियां एवं चारा");
    else if (name.includes("Parcel D")) tName = name.replace("Parcel D: Border Trap Crops & Honeybee Corridor", "भूखंड D: सीमा ट्रैप फसलें एवं मधुमक्खी गलियारा");

    if (purpose.includes("Intensive organic cultivation")) tPurpose = "सघन जैविक खेती और अधिकतम उपज क्षमता।";
    else if (purpose.includes("Soil restoration")) tPurpose = "मिट्टी की उर्वरता बढ़ाना और अतिरिक्त आमदनी।";
    else if (purpose.includes("Continuous weekly cashflow")) tPurpose = "साप्ताहिक निरंतर नकदी प्रवाह और पशुओं के लिए पौष्टिक चारा।";
    else if (purpose.includes("Natural pest suppression")) tPurpose = "प्राकृतिक कीट नियंत्रण और परागण वृद्धि।";

    if (irrigation.includes("Automated drip lines")) tIrrigation = "स्वचालित सोलर ड्रिप लाइनें";
    else if (irrigation.includes("Micro-sprinklers")) tIrrigation = "माइक्रो-स्प्रिंकलर या ड्रिप";
    else if (irrigation.includes("Overhead misting")) tIrrigation = "ओवरहेड मिस्टिंग या फव्वारा सिंचाई";
    else if (irrigation.includes("Perimeter drip buffer")) tIrrigation = "सीमा ड्रिप बफर लाइनें";

    return { name: tName, purpose: tPurpose, irrigation: tIrrigation };
  }

  if (lang === "kn") {
    let tName = name;
    let tPurpose = purpose;
    let tIrrigation = irrigation;

    if (name.includes("Parcel A")) tName = name.replace("Parcel A: Primary Cash Crop", "ವಿಭಾಗ A: ಮುಖ್ಯ ವಾಣಿಜ್ಯ ಬೆಳೆ");
    else if (name.includes("Parcel B")) tName = name.replace("Parcel B: Nitrogen-Fixing Pulses", "ವಿಭಾಗ B: ಸಾರಜನಕ ಸ್ಥಿರೀಕರಣ ದ್ವಿದಳ ಧಾನ್ಯಗಳು");
    else if (name.includes("Parcel C")) tName = name.replace("Parcel C: Short-Cycle Greens & Fodder", "ವಿಭಾಗ C: ಅಲ್ಪಾವಧಿ ಸೊಪ್ಪು ಮತ್ತು ಮೇವು");
    else if (name.includes("Parcel D")) tName = name.replace("Parcel D: Border Trap Crops & Honeybee Corridor", "ವಿಭಾಗ D: ಗಡಿ ಬೆಳೆಗಳು ಮತ್ತು ಜೇನುನೊಣ ಕಾರಿಡಾರ್");

    if (purpose.includes("Intensive organic cultivation")) tPurpose = "ತೀವ್ರ ಸಾವಯವ ಕೃಷಿ ಮತ್ತು ಗರಿಷ್ಠ ಇಳುವರಿ.";
    else if (purpose.includes("Soil restoration")) tPurpose = "ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೆಚ್ಚಳ ಮತ್ತು ಹೆಚ್ಚುವರಿ ಆದಾಯ.";
    else if (purpose.includes("Continuous weekly cashflow")) tPurpose = "ವಾರಕ್ಕೊಮ್ಮೆ ನಿರಂತರ ಆದಾಯ ಮತ್ತು ಹಸುಗಳಿಗೆ ಪೌಷ್ಟಿಕ ಮೇವು.";
    else if (purpose.includes("Natural pest suppression")) tPurpose = "ನೈಸರ್ಗಿಕ ಕೀಟ ನಿಯಂತ್ರಣ ಮತ್ತು ಪರಾಗಸ್ಪರ್ಶ ವೃದ್ಧಿ.";

    if (irrigation.includes("Automated drip lines")) tIrrigation = "ಸ್ವಯಂಚಾಲಿತ ಸೋಲಾರ್ ಹನಿ ನೀರಾವರಿ";
    else if (irrigation.includes("Micro-sprinklers")) tIrrigation = "ಮೈಕ್ರೋ-ಸ್ಪ್ರಿಂಕ್ಲರ್ ಅಥವಾ ಹನಿ ನೀರಾವರಿ";
    else if (irrigation.includes("Overhead misting")) tIrrigation = "ತುಂತುರು ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ";
    else if (irrigation.includes("Perimeter drip buffer")) tIrrigation = "ಗಡಿ ಹನಿ ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ";

    return { name: tName, purpose: tPurpose, irrigation: tIrrigation };
  }

  return { name, purpose, irrigation };
}

/**
 * Helper to translate nutrition stage names
 */
export function translateNutritionStage(
  phase: string,
  timing: string,
  input: string,
  lang: AppLang
) {
  if (lang === "en") return { phase, timing, input };

  if (lang === "te") {
    let tPhase = phase;
    let tTiming = timing;
    let tInput = input;

    if (phase.includes("Pre-planting Basal Application")) tPhase = "నాటడానికి ముందు భూమి తయారీ (బేసల్ డోస్)";
    else if (phase.includes("Vegetative Growth Phase")) tPhase = "శాఖీయ ఎదుగుదల దశ (వృద్ది దశ)";
    else if (phase.includes("Flowering & Fruit Setting")) tPhase = "పూత మరియు పిందె కట్టే దశ";
    else if (phase.includes("Fruit Maturation & Harvest")) tPhase = "కాయ ఎదుగుదల & పంట కోత దశ";

    if (timing.includes("7 days before sowing")) tTiming = "విత్తడానికి 7 రోజుల ముందు";
    else if (timing.includes("Day 20 - Day 35")) tTiming = "20 నుండి 35 వ రోజు";
    else if (timing.includes("Day 45 - Day 60")) tTiming = "45 నుండి 60 వ రోజు";
    else if (timing.includes("Day 75+")) tTiming = "75 వ రోజు తరువాత";

    if (input.includes("FYM Composted Manure")) tInput = "పశువుల పేడ ఎరువు (FYM) + ఘనజీవామృతం లేదా ట్రైకోడెర్మా విరిడే మట్టిలో కలపండి.";
    else if (input.includes("Jeevamrut drenching")) tInput = "డ్రిప్ ద్వారా జీవామృతం (200 లీ/ఎకరం) లేదా దశపర్ణి కషాయం పిచికారీ చేయండి.";
    else if (input.includes("Fermented buttermilk")) tInput = "పులిసిన మజ్జిగ ద్రావణం (5%) + పంచగవ్య పిచికారీ పూత రాలకుండా కాపాడుతుంది.";
    else if (input.includes("Waste decomposer")) tInput = "వేస్ట్ డీకంపోజర్ ద్రావణం లేదా పొటాష్ సమృద్ధిగా ఉండే బూడిద ద్రావణం అందించండి.";

    return { phase: tPhase, timing: tTiming, input: tInput };
  }

  if (lang === "hi") {
    let tPhase = phase;
    let tTiming = timing;
    let tInput = input;

    if (phase.includes("Pre-planting Basal Application")) tPhase = "बुवाई पूर्व भूमि तैयारी (बेसल खुराक)";
    else if (phase.includes("Vegetative Growth Phase")) tPhase = "वानस्पतिक वृद्धि अवस्था";
    else if (phase.includes("Flowering & Fruit Setting")) tPhase = "फूल एवं फल लगने की अवस्था";
    else if (phase.includes("Fruit Maturation & Harvest")) tPhase = "फल परिपक्वता एवं कटाई अवस्था";

    if (timing.includes("7 days before sowing")) tTiming = "बुवाई से 7 दिन पूर्व";
    else if (timing.includes("Day 20 - Day 35")) tTiming = "20 से 35 दिन";
    else if (timing.includes("Day 45 - Day 60")) tTiming = "45 से 60 दिन";
    else if (timing.includes("Day 75+")) tTiming = "75 दिन के बाद";

    if (input.includes("FYM Composted Manure")) tInput = "गोबर की खाद (FYM) + घनजीवामृत या ट्राइकोडर्मा मिट्टी में मिलाएं।";
    else if (input.includes("Jeevamrut drenching")) tInput = "ड्रिप द्वारा जीवामृत (200 ली/एकड़) या दशपर्णी अर्क का छिड़काव करें।";
    else if (input.includes("Fermented buttermilk")) tInput = "खट्टी छाछ (5%) + पंचगव्य छिड़काव से फूल झड़ने से रोकें।";
    else if (input.includes("Waste decomposer")) tInput = "वेस्ट डीकंपोजर घोल या राख का अर्क ड्रिप द्वारा दें।";

    return { phase: tPhase, timing: tTiming, input: tInput };
  }

  if (lang === "kn") {
    let tPhase = phase;
    let tTiming = timing;
    let tInput = input;

    if (phase.includes("Pre-planting Basal Application")) tPhase = "ಬಿತ್ತನೆಗೆ ಮುಂಚಿನ ಭೂಮಿ ಸಿದ್ಧತೆ";
    else if (phase.includes("Vegetative Growth Phase")) tPhase = "ಸಸ್ಯ ಬೆಳವಣಿಗೆಯ ಹಂತ";
    else if (phase.includes("Flowering & Fruit Setting")) tPhase = "ಹೂವು ಮತ್ತು ಕಾಯಿ ಬಿಡುವ ಹಂತ";
    else if (phase.includes("Fruit Maturation & Harvest")) tPhase = "ಕಾಯಿ ಬಲಿತ ಹಂತ ಮತ್ತು ಕೊಯ್ಲು";

    if (timing.includes("7 days before sowing")) tTiming = "ಬಿತ್ತನೆಗೆ 7 ದಿನ ಮೊದಲು";
    else if (timing.includes("Day 20 - Day 35")) tTiming = "20 ರಿಂದ 35 ನೇ ದಿನ";
    else if (timing.includes("Day 45 - Day 60")) tTiming = "45 ರಿಂದ 60 ನೇ ದಿನ";
    else if (timing.includes("Day 75+")) tTiming = "75 ನೇ ದಿನದ ನಂತರ";

    if (input.includes("FYM Composted Manure")) tInput = "ಹಟ್ಟಿಗೊಬ್ಬರ (FYM) + ಘನಜೀವಾಮೃತ ಅಥವಾ ಟ್ರೈಕೋಡರ್ಮಾ ಮಣ್ಣಿಗೆ ಸೇರಿಸಿ.";
    else if (input.includes("Jeevamrut drenching")) tInput = "ಹನಿ ನೀರಾವರಿ ಮೂಲಕ ಜೀವಾಮೃತ (200 ಲೀ/ಎಕರೆ) ಅಥವಾ ದಶಪರ್ಣಿ ಕಷಾಯ ಸಿಂಪಡಿಸಿ.";
    else if (input.includes("Fermented buttermilk")) tInput = "ಹುಳಿ ಮಜ್ಜಿಗೆ (5%) + ಪಂಚಗವ್ಯ ಸಿಂಪಡಿಸಿ ಹೂವು ಉದುರುವುದನ್ನು ತಡೆಯಿರಿ.";
    else if (input.includes("Waste decomposer")) tInput = "ತ್ಯಾಜ್ಯ ವಿಘಟಕ ದ್ರಾವಣ ಅಥವಾ ಬೂದಿ ಸಾರವನ್ನು ನೀಡಿ.";

    return { phase: tPhase, timing: tTiming, input: tInput };
  }

  return { phase, timing, input };
}
