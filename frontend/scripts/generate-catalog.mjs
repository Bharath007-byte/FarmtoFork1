import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FARMERS = [
  ["Green Valley Orchards", "Himachal Pradesh"],
  ["Krishna Organic Farm", "Maharashtra"],
  ["Sri Lakshmi Farms", "Andhra Pradesh"],
  ["Nature's Basket Farm", "Karnataka"],
  ["Ananda Dairy Farm", "Tamil Nadu"],
  ["Pure Village Dairy", "Telangana"],
  ["Eastern Spice Farms", "Andhra Pradesh"],
  ["Rayalaseema Organics", "Andhra Pradesh"],
  ["Shree Go Farms", "Karnataka"],
  ["Vedic Farms", "Rajasthan"],
  ["Himalayan Orchards", "Uttarakhand"],
  ["Deccan Harvest", "Telangana"],
  ["Malabar Spice Co-op", "Kerala"],
  ["Punjab Dairy Collective", "Punjab"],
  ["Konkan Fruit Belt", "Maharashtra"],
  ["Nilgiri Greens", "Tamil Nadu"],
  ["Kutch Camel Dairy", "Gujarat"],
  ["Assam Citrus Groves", "Assam"],
  ["Nashik Vineyard Farm", "Maharashtra"],
  ["Bihar Litchi Belt", "Bihar"],
];

const IMAGES = {
  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=700&q=80",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=80",
  citrus: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=700&q=80",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=700&q=80",
  papaya: "https://images.unsplash.com/photo-1617112848923-cc2234396a8d?auto=format&fit=crop&w=700&q=80",
  pineapple: "https://images.unsplash.com/photo-1550258987-190d2d87cb80?auto=format&fit=crop&w=700&q=80",
  pomegranate: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=700&q=80",
  grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=700&q=80",
  melon: "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?auto=format&fit=crop&w=700&q=80",
  watermelon: "https://images.unsplash.com/photo-1563114773-84221acddef4?auto=format&fit=crop&w=700&q=80",
  guava: "https://images.unsplash.com/photo-1536511132770-e5058c0e4c2c?auto=format&fit=crop&w=700&q=80",
  berries: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=700&q=80",
  tropical: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=700&q=80",
  tomato: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=80",
  leafy: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=700&q=80",
  root: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=80",
  onion: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=80",
  gourd: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=700&q=80",
  chilli: "https://images.unsplash.com/photo-1583119022894-035ad2ba44c5?auto=format&fit=crop&w=700&q=80",
  vegmix: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80",
  mushroom: "https://images.unsplash.com/photo-1504545102780-26774c6da73f?auto=format&fit=crop&w=700&q=80",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=700&q=80",
  curd: "https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=700&q=80",
  paneer: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=700&q=80",
  cheese: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a9d6?auto=format&fit=crop&w=700&q=80",
  yogurt: "https://images.unsplash.com/photo-1488477181946-6428a29bdf58?auto=format&fit=crop&w=700&q=80",
  butter: "https://images.unsplash.com/photo-1589985270826-4bd64686d82b?auto=format&fit=crop&w=700&q=80",
  turmeric: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=700&q=80",
  spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80",
  chilliSpice: "https://images.unsplash.com/photo-1596321497487-e288fb19713f?auto=format&fit=crop&w=700&q=80",
  ghee: "https://images.unsplash.com/photo-1635363638580-c2809d049eee?auto=format&fit=crop&w=700&q=80",
  gheeJar: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=700&q=80",
};

function farmerFor(i) {
  return FARMERS[i % FARMERS.length];
}

function money(n) {
  return Math.round(n);
}

function rating(seed) {
  return Number((4.3 + (seed % 7) * 0.1).toFixed(1));
}

const products = [];
const names = new Set();

function add(item) {
  if (names.has(item.name)) {
    throw new Error(`Duplicate name: ${item.name}`);
  }
  names.add(item.name);
  const idx = products.length;
  const [farmer, location] = farmerFor(idx + item.name.length);
  const organic = /organic|bilona|a2 |grass-fed/i.test(item.name);
  products.push({
    id: `F2F-${String(idx + 1).padStart(4, "0")}`,
    name: item.name,
    category: item.category,
    subCategory: item.subCategory,
    farmer,
    location,
    weight: item.weight,
    price: money(item.price),
    originalPrice: money(item.price * (organic ? 1.08 : 1.18)),
    rating: rating(idx),
    reviews: 12 + ((idx * 17) % 480),
    imageUrl: item.image,
    badge: item.badge,
    inStock: idx % 23 !== 0,
    organic,
    description: item.description,
  });
}

function pack(baseName, weight, _price, extra = "") {
  const prefix =
    extra && !baseName.toLowerCase().includes(extra.toLowerCase().split(" ")[0])
      ? `${extra} `
      : "";
  return `${prefix}${baseName} · ${weight}`;
}

// --- FRUITS: 40 × 3 = 120 ---
const fruitBases = [
  ["Alphonso Mango", "Mangoes", IMAGES.mango, 280, "King of mangoes from Ratnagiri orchards, tree-ripened."],
  ["Kesar Mango", "Mangoes", IMAGES.mango, 220, "Saffron-hued Gir Kesar with a honeyed aroma."],
  ["Dasheri Mango", "Mangoes", IMAGES.mango, 160, "North Indian summer favourite, fibre-light and sweet."],
  ["Banganapalli Mango", "Mangoes", IMAGES.mango, 150, "Large Andhra mangoes with pale, buttery flesh."],
  ["Himachal Red Apple", "Apples", IMAGES.apple, 145, "Crisp high-altitude apples from Himalayan orchards."],
  ["Kashmiri Apple", "Apples", IMAGES.apple, 165, "Snow-fed valley apples with a bright snap."],
  ["Shimla Apple", "Apples", IMAGES.apple, 138, "Classic Shimla reds, packed the morning after harvest."],
  ["Granny Smith Apple", "Apples", IMAGES.apple, 190, "Tart green apples for snacking and salads."],
  ["Nagpur Orange", "Citrus", IMAGES.citrus, 95, "Loose-jacket oranges from the Nagpur belt."],
  ["Kinnow", "Citrus", IMAGES.citrus, 80, "Juicy Punjab kinnows, easy to peel."],
  ["Mosambi", "Citrus", IMAGES.citrus, 70, "Sweet lime for fresh juice at home."],
  ["Robusta Banana", "Bananas", IMAGES.banana, 48, "Everyday cooking and breakfast bananas."],
  ["Yelakki Banana", "Bananas", IMAGES.banana, 72, "Small aromatic Karnataka yelakki."],
  ["Nendran Banana", "Bananas", IMAGES.banana, 65, "Kerala nendran, firm and slightly tangy."],
  ["Red Banana", "Bananas", IMAGES.banana, 90, "Vitamin-rich red-skin bananas."],
  ["Honeydew Papaya", "Papaya", IMAGES.papaya, 55, "Ripe, low-seed papaya from coastal farms."],
  ["Queen Pineapple", "Pineapple", IMAGES.pineapple, 85, "Tripura queen pineapples, fragrant and sharp-sweet."],
  ["Bhagwa Pomegranate", "Pomegranate", IMAGES.pomegranate, 175, "Deep-red arils with high juice yield."],
  ["Thompson Seedless Grapes", "Grapes", IMAGES.grapes, 120, "Crisp green grapes from Nashik vines."],
  ["Bangalore Blue Grapes", "Grapes", IMAGES.grapes, 110, "Winey local blues, excellent for juice."],
  ["Kiran Watermelon", "Melons", IMAGES.watermelon, 35, "Field-ripened watermelon sold by the kilo."],
  ["Muskmelon", "Melons", IMAGES.melon, 48, "Net-skin muskmelon with floral sweetness."],
  ["Allahabad Guava", "Guava", IMAGES.guava, 68, "Pink-fleshed winter guavas."],
  ["Chikoo", "Sapota", IMAGES.tropical, 90, "Malabar sapota, malty and soft."],
  ["Shahi Lychee", "Lychee", IMAGES.berries, 240, "Muzaffarpur shahi lychee, short-season only."],
  ["Tender Coconut", "Coconut", IMAGES.tropical, 45, "Chilled tender coconut water, farm-cut."],
  ["Dragon Fruit", "Exotic", IMAGES.tropical, 160, "White-flesh pitaya from Deccan farms."],
  ["Zespri-style Kiwi", "Exotic", IMAGES.tropical, 210, "Indian-grown kiwi, tangy-green."],
  ["Mahabaleshwar Strawberry", "Berries", IMAGES.berries, 320, "Hill-station strawberries, packed cold."],
  ["Farm Blueberry", "Berries", IMAGES.berries, 450, "Greenhouse blueberries from Pune belt."],
  ["Hass Avocado", "Exotic", IMAGES.tropical, 280, "Creamy Hass from Coorg slopes."],
  ["Nashpati Pear", "Pome fruit", IMAGES.apple, 130, "Juicy Indian pears."],
  ["Santa Rosa Plum", "Stone fruit", IMAGES.berries, 180, "Tart-sweet stone fruit from Himachal."],
  ["July Elberta Peach", "Stone fruit", IMAGES.berries, 195, "Fuzzy peaches, tree-ripened."],
  ["Dried Anjeer Figs", "Dried fruit", IMAGES.tropical, 420, "Sun-dried figs from Maharashtra."],
  ["Medjool Dates", "Dried fruit", IMAGES.tropical, 380, "Soft medjool-style dates."],
  ["Farm Amla", "Indian fruit", IMAGES.citrus, 60, "Vitamin C rich Indian gooseberry."],
  ["Jamun", "Indian fruit", IMAGES.berries, 140, "Seasonal jamun, staining-purple."],
  ["Sitaphal Custard Apple", "Indian fruit", IMAGES.tropical, 95, "Custard apple with creamy segments."],
  ["Passion Fruit", "Exotic", IMAGES.tropical, 220, "Aromatic purple passion fruit."],
];

const fruitSizes = [
  ["500 g", 0.55, "Farm Fresh"],
  ["1 kg", 1, "Organic"],
  ["2 kg crate", 1.85, "Harvest Crate"],
];

fruitBases.forEach(([name, sub, image, base, desc]) => {
  fruitSizes.forEach(([weight, mul, extra]) => {
    add({
      name: pack(name, weight, base * mul, extra),
      category: "Fruits",
      subCategory: sub,
      weight,
      price: base * mul,
      image,
      badge: extra === "Organic" ? "Organic" : extra === "Harvest Crate" ? "Family pack" : "Farm fresh",
      description: desc,
    });
  });
});

// --- VEGETABLES: 40 × 3 = 120 ---
const vegBases = [
  ["Hybrid Tomato", "Tomato", IMAGES.tomato, 42, "Firm salad tomatoes, morning-picked."],
  ["Cherry Tomato", "Tomato", IMAGES.tomato, 95, "Sweet bite-size tomatoes on the vine."],
  ["Desi Tomato", "Tomato", IMAGES.tomato, 48, "Tangy country tomatoes for rasam and curry."],
  ["Nashik Onion", "Onion", IMAGES.onion, 38, "Red onions from the Nashik belt."],
  ["White Onion", "Onion", IMAGES.onion, 52, "Mild white onions for salads."],
  ["Shallots", "Onion", IMAGES.onion, 110, "Small sambar onions."],
  ["Table Potato", "Potato", IMAGES.root, 32, "All-purpose potatoes, washed."],
  ["Baby Potato", "Potato", IMAGES.root, 58, "Tender baby potatoes."],
  ["Sweet Potato", "Root", IMAGES.root, 55, "Orange-flesh sweet potatoes."],
  ["Ooty Carrot", "Root", IMAGES.root, 48, "Hill carrots, naturally sweet."],
  ["Beetroot", "Root", IMAGES.root, 44, "Earthy beetroot, unwaxed."],
  ["White Radish", "Root", IMAGES.root, 36, "Crunchy mooli."],
  ["Green Cabbage", "Cruciferous", IMAGES.vegmix, 28, "Tight-head cabbage."],
  ["Cauliflower", "Cruciferous", IMAGES.vegmix, 42, "Snow-white gobi heads."],
  ["Broccoli", "Cruciferous", IMAGES.vegmix, 85, "Compact broccoli florets."],
  ["Palak Spinach", "Leafy", IMAGES.leafy, 30, "Tender palak bunches."],
  ["Methi Leaves", "Leafy", IMAGES.leafy, 28, "Bitter-sweet fenugreek greens."],
  ["Amaranth Chaulai", "Leafy", IMAGES.leafy, 26, "Red and green amaranth mix."],
  ["Coriander Bunch", "Herbs", IMAGES.leafy, 18, "Fragrant coriander, roots on."],
  ["Mint Bunch", "Herbs", IMAGES.leafy, 20, "Garden mint for chutney."],
  ["Green Chilli", "Chilli", IMAGES.chilli, 40, "Medium-hot green chillies."],
  ["Capsicum", "Capsicum", IMAGES.vegmix, 62, "Green bell peppers."],
  ["Red Capsicum", "Capsicum", IMAGES.vegmix, 88, "Ripe red peppers."],
  ["Cucumber", "Gourd", IMAGES.gourd, 34, "Cooling salad cucumbers."],
  ["Ridge Gourd", "Gourd", IMAGES.gourd, 40, "Tender turai."],
  ["Bitter Gourd", "Gourd", IMAGES.gourd, 52, "Karela, small and firm."],
  ["Bottle Gourd", "Gourd", IMAGES.gourd, 36, "Lauki for dals and juices."],
  ["Brinjal", "Nightshade", IMAGES.vegmix, 44, "Purple bharta brinjal."],
  ["Okra Bhindi", "Okra", IMAGES.vegmix, 48, "Tender bhindi, low-seed."],
  ["French Beans", "Beans", IMAGES.vegmix, 70, "Stringless French beans."],
  ["Green Peas", "Peas", IMAGES.vegmix, 90, "Shelled garden peas."],
  ["Sweet Corn", "Corn", IMAGES.vegmix, 55, "Cob corn, steamed-ready."],
  ["Farm Ginger", "Rhizome", IMAGES.root, 120, "Bold-aroma ginger."],
  ["Garlic", "Rhizome", IMAGES.root, 140, "Tight garlic bulbs."],
  ["Lime", "Citrus veg", IMAGES.citrus, 80, "Thin-skin cooking limes."],
  ["Yellow Pumpkin", "Gourd", IMAGES.gourd, 30, "Sweet yellow pumpkin wedges."],
  ["Drumstick", "Pod", IMAGES.vegmix, 64, "Moringa pods."],
  ["Button Mushroom", "Mushroom", IMAGES.mushroom, 75, "Fresh white buttons."],
  ["Oyster Mushroom", "Mushroom", IMAGES.mushroom, 110, "Cluster oyster mushrooms."],
  ["Spring Onion", "Allium", IMAGES.leafy, 40, "Greens and bulbs together."],
];

const vegSizes = [
  ["250 g", 0.55, "Kitchen pack"],
  ["500 g", 1, "Organic"],
  ["1 kg", 1.85, "Farm crate"],
];

vegBases.forEach(([name, sub, image, base, desc]) => {
  vegSizes.forEach(([weight, mul, extra]) => {
    add({
      name: pack(name, weight, base * mul, extra),
      category: "Vegetables",
      subCategory: sub,
      weight,
      price: Math.max(12, base * mul),
      image,
      badge: extra === "Organic" ? "Organic" : extra === "Farm crate" ? "Value pack" : "Fresh cut",
      description: desc,
    });
  });
});

// --- DAIRY: 40 × 3 = 120 ---
const dairyBases = [
  ["A2 Gir Cow Milk", "Milk", IMAGES.milk, 78, "A2 beta-casein milk from Gir cows, morning milked."],
  ["Sahiwal Cow Milk", "Milk", IMAGES.milk, 72, "Full-cream Sahiwal milk."],
  ["Buffalo Milk", "Milk", IMAGES.milk, 82, "Rich buffalo milk for set curd and khoya."],
  ["Toned Cow Milk", "Milk", IMAGES.milk, 56, "Everyday toned milk."],
  ["Skimmed Cow Milk", "Milk", IMAGES.milk, 52, "Low-fat skimmed milk."],
  ["Goat Milk", "Milk", IMAGES.milk, 120, "Easily digestible farm goat milk."],
  ["Farm Set Curd", "Curd", IMAGES.curd, 55, "Set in clay-style pots overnight."],
  ["Buffalo Curd", "Curd", IMAGES.curd, 68, "Thick buffalo dahi."],
  ["Probiotic Curd", "Curd", IMAGES.curd, 75, "Live-culture probiotic dahi."],
  ["Low-fat Curd", "Curd", IMAGES.curd, 50, "Light set curd."],
  ["Greek-style Yogurt", "Yogurt", IMAGES.yogurt, 95, "Strained farm yogurt."],
  ["Mango Farm Yogurt", "Yogurt", IMAGES.yogurt, 88, "Alphonso swirl yogurt."],
  ["Strawberry Yogurt", "Yogurt", IMAGES.yogurt, 88, "Hill strawberry yogurt."],
  ["Natural Unsweetened Yogurt", "Yogurt", IMAGES.yogurt, 80, "Plain cultured yogurt."],
  ["Malai Paneer", "Paneer", IMAGES.paneer, 140, "Soft malai paneer blocks."],
  ["Low-fat Paneer", "Paneer", IMAGES.paneer, 130, "Firm low-fat paneer."],
  ["Cow Milk Paneer", "Paneer", IMAGES.paneer, 135, "Classic cow-milk paneer."],
  ["Buffalo Paneer", "Paneer", IMAGES.paneer, 155, "Denser buffalo paneer."],
  ["Salted White Butter", "Butter", IMAGES.butter, 110, "Churned white butter, lightly salted."],
  ["Unsalted White Butter", "Butter", IMAGES.butter, 108, "Unsalted makhan for cooking."],
  ["Cultured Butter", "Butter", IMAGES.butter, 145, "Slow-cultured yellow butter."],
  ["Farm Fresh Cream", "Cream", IMAGES.milk, 90, "High-fat pouring cream."],
  ["Malai Clotted Cream", "Cream", IMAGES.milk, 125, "Skin malai from buffalo milk."],
  ["Chaas Buttermilk", "Buttermilk", IMAGES.curd, 35, "Spiced farm chaas."],
  ["Sweet Lassi", "Lassi", IMAGES.yogurt, 48, "Punjab-style sweet lassi."],
  ["Salted Lassi", "Lassi", IMAGES.yogurt, 45, "Cumin salted lassi."],
  ["Mozzarella Block", "Cheese", IMAGES.cheese, 280, "Farmstead mozzarella."],
  ["Cheddar Block", "Cheese", IMAGES.cheese, 320, "Aged farm cheddar."],
  ["Cottage Cheese", "Cheese", IMAGES.cheese, 160, "Fresh chenna-style cottage cheese."],
  ["Artisan Gouda", "Cheese", IMAGES.cheese, 420, "Wheel-cut gouda from a micro dairy."],
  ["Khoya Mawa", "Khoya", IMAGES.paneer, 240, "Reduced-milk khoya."],
  ["Shrikhand Elaichi", "Dessert dairy", IMAGES.yogurt, 95, "Cardamom shrikhand."],
  ["Mishti Doi", "Dessert dairy", IMAGES.curd, 70, "Caramelised Bengali doi."],
  ["Flavoured Badam Milk", "Flavoured milk", IMAGES.milk, 62, "Almond-cardamom milk."],
  ["Turmeric Haldi Milk", "Flavoured milk", IMAGES.milk, 65, "Golden milk, lightly sweetened."],
  ["Kefir Drink", "Cultured", IMAGES.yogurt, 110, "Mildly fizzy kefir."],
  ["Whey Protein Curd Water", "Whey", IMAGES.curd, 28, "Fresh whey from paneer making."],
  ["Kalari Cheese", "Cheese", IMAGES.cheese, 360, "Himalayan stretched-curd cheese."],
  ["Bandel Cheese", "Cheese", IMAGES.cheese, 310, "Smoked East-Indian farm cheese."],
  ["Colostrum Kharwas Mix", "Specialty", IMAGES.milk, 190, "Traditional first-milk pudding mix."],
];

const dairySizes = [
  ["200 ml / 200 g", 0.55, "Small batch"],
  ["500 ml / 500 g", 1, "Organic"],
  ["1 L / 1 kg", 1.85, "Family"],
];

dairyBases.forEach(([name, sub, image, base, desc]) => {
  dairySizes.forEach(([weight, mul, extra]) => {
    add({
      name: pack(name, weight, base * mul, extra),
      category: "Dairy",
      subCategory: sub,
      weight,
      price: base * mul,
      image,
      badge: extra === "Organic" ? "A2 / Organic" : extra === "Family" ? "Family pack" : "Daily fresh",
      description: desc,
    });
  });
});

// --- SPICES: 40 × 3 = 120 ---
const spiceBases = [
  ["Lakadong Turmeric Powder", "Turmeric", IMAGES.turmeric, 185, "High-curcumin Lakadong turmeric."],
  ["Salem Turmeric Fingers", "Turmeric", IMAGES.turmeric, 160, "Whole dried turmeric fingers."],
  ["Guntur Chilli Powder", "Chilli", IMAGES.chilliSpice, 210, "Hot Guntur chilli, stone-ground."],
  ["Kashmiri Chilli Powder", "Chilli", IMAGES.chilliSpice, 240, "Colour-rich, mild Kashmiri chilli."],
  ["Byadgi Whole Chilli", "Chilli", IMAGES.chilliSpice, 230, "Wrinkled Byadgi pods."],
  ["Dhania Coriander Powder", "Coriander", IMAGES.spices, 95, "Roasted coriander powder."],
  ["Whole Coriander Seeds", "Coriander", IMAGES.spices, 88, "Green coriander seeds."],
  ["Jeera Cumin Seeds", "Cumin", IMAGES.spices, 220, "Bold cumin from Unjha."],
  ["Cumin Powder", "Cumin", IMAGES.spices, 230, "Fresh-milled cumin powder."],
  ["Black Mustard Seeds", "Mustard", IMAGES.spices, 70, "Rai for tempering."],
  ["Fenugreek Methi Seeds", "Fenugreek", IMAGES.spices, 80, "Bitter-sweet methi dana."],
  ["Saunf Fennel", "Fennel", IMAGES.spices, 160, "Lucknow saunf."],
  ["Green Cardamom", "Cardamom", IMAGES.spices, 980, "8mm green cardamom pods."],
  ["Black Cardamom", "Cardamom", IMAGES.spices, 640, "Smoky badi elaichi."],
  ["Whole Cloves", "Clove", IMAGES.spices, 720, "Nail-tight cloves."],
  ["Ceylon-style Cinnamon Quills", "Cinnamon", IMAGES.spices, 420, "True cinnamon quills."],
  ["Cassia Bark", "Cinnamon", IMAGES.spices, 180, "Robust cassia for biryani."],
  ["Tellicherry Black Pepper", "Pepper", IMAGES.spices, 560, "Malabar Tellicherry peppercorns."],
  ["White Pepper Powder", "Pepper", IMAGES.spices, 620, "Decorticated white pepper."],
  ["Whole Nutmeg", "Nutmeg", IMAGES.spices, 480, "Banda nutmeg, grated fresh."],
  ["Mace Javitri", "Mace", IMAGES.spices, 890, "Lacy mace blades."],
  ["Star Anise", "Anise", IMAGES.spices, 340, "Whole star anise."],
  ["Bay Leaves Tejpatta", "Leaf spice", IMAGES.spices, 90, "Himalayan bay leaves."],
  ["Compound Hing", "Asafoetida", IMAGES.spices, 160, "Compound hing, lump form."],
  ["Garam Masala Blend", "Blend", IMAGES.spices, 210, "House-roasted garam masala."],
  ["Sambar Powder", "Blend", IMAGES.spices, 185, "Tamarind-forward sambar podi."],
  ["Rasam Powder", "Blend", IMAGES.spices, 175, "Pepper-jeera rasam mix."],
  ["Kitchen King Blend", "Blend", IMAGES.spices, 195, "North Indian kitchen king."],
  ["Ajwain Carom", "Seed", IMAGES.spices, 140, "Pungent ajwain."],
  ["Kalonji Nigella", "Seed", IMAGES.spices, 150, "Nigella for naan and pickles."],
  ["White Poppy Khuskhus", "Seed", IMAGES.spices, 280, "White poppy seeds."],
  ["White Sesame Til", "Seed", IMAGES.spices, 95, "Hulled white sesame."],
  ["Black Sesame", "Seed", IMAGES.spices, 110, "Unhulled black sesame."],
  ["Mongra Saffron", "Saffron", IMAGES.spices, 420, "Kashmir mongra strands (1 g equivalent pack)."],
  ["Dry Ginger Saunth", "Ginger", IMAGES.spices, 190, "Sun-dried ginger powder."],
  ["Amchur Powder", "Souring", IMAGES.spices, 130, "Raw mango powder."],
  ["Anardana", "Souring", IMAGES.spices, 170, "Dried pomegranate seeds."],
  ["Kasuri Methi", "Leaf spice", IMAGES.spices, 85, "Dried fenugreek leaves."],
  ["Curry Leaves Dried", "Leaf spice", IMAGES.spices, 70, "Shade-dried curry leaves."],
  ["Panch Phoron Mix", "Blend", IMAGES.spices, 125, "Bengal five-spice mix."],
];

const spiceSizes = [
  ["50 g", 0.45, "Pouch"],
  ["100 g", 0.85, "Organic"],
  ["250 g", 1.9, "Bulk jar"],
];

spiceBases.forEach(([name, sub, image, base, desc]) => {
  spiceSizes.forEach(([weight, mul, extra]) => {
    const saffronAdjust = name.includes("Saffron") ? (weight === "50 g" ? 1 : weight === "100 g" ? 1.9 : 4.4) : mul;
    add({
      name: pack(name, weight, base * saffronAdjust, extra),
      category: "Spices",
      subCategory: sub,
      weight,
      price: name.includes("Saffron") ? base * saffronAdjust : base * mul,
      image,
      badge: extra === "Organic" ? "Organic" : extra === "Bulk jar" ? "Value" : "Single origin",
      description: desc,
    });
  });
});

// --- GHEE: 40 × 3 = 120 ---
const gheeBases = [
  ["Desi Cow Ghee", "Cow ghee", IMAGES.ghee, 620, "Clarified desi cow ghee, grainy texture."],
  ["A2 Gir Cow Ghee", "A2 ghee", IMAGES.ghee, 890, "A2 Gir cow ghee, slow-simmered."],
  ["A2 Sahiwal Ghee", "A2 ghee", IMAGES.ghee, 860, "Sahiwal A2 ghee with a nutty finish."],
  ["A2 Tharparkar Ghee", "A2 ghee", IMAGES.ghee, 910, "Desert-breed Tharparkar A2 ghee."],
  ["Bilona Cow Ghee", "Bilona", IMAGES.gheeJar, 980, "Hand-churned bilona method, curd to ghee."],
  ["Bilona A2 Ghee", "Bilona", IMAGES.gheeJar, 1280, "A2 milk, cultured, bilona-churned."],
  ["Grass-fed Cow Ghee", "Grass-fed", IMAGES.ghee, 740, "Pasture-grazed cow ghee."],
  ["Buffalo Ghee", "Buffalo", IMAGES.gheeJar, 540, "White buffalo ghee, high smoke point."],
  ["A2 Buffalo Ghee", "Buffalo", IMAGES.gheeJar, 680, "Murrah buffalo A2-style ghee."],
  ["Cultured Vedic Ghee", "Vedic", IMAGES.ghee, 1100, "Vedic culture, wood-fire finish."],
  ["Village Clay-pot Ghee", "Traditional", IMAGES.gheeJar, 760, "Finished in earthen pots."],
  ["Himalayan Cow Ghee", "Regional", IMAGES.ghee, 820, "Hill-cattle ghee from Uttarakhand."],
  ["Karnataka Malnad Ghee", "Regional", IMAGES.ghee, 790, "Malnad cow ghee."],
  ["Rajasthan Desert Ghee", "Regional", IMAGES.ghee, 770, "Arid-pasture cow ghee."],
  ["Organic Certified Cow Ghee", "Organic", IMAGES.ghee, 940, "Third-party organic cow ghee."],
  ["Organic Bilona Ghee", "Organic", IMAGES.gheeJar, 1350, "Certified organic bilona ghee."],
  ["Lactose-light Ghee", "Specialty", IMAGES.ghee, 880, "Long-simmered, milk-solid skimmed."],
  ["Herb Infused Ghee", "Flavoured", IMAGES.gheeJar, 990, "Curry leaf and pepper infused."],
  ["Garlic Temper Ghee", "Flavoured", IMAGES.gheeJar, 970, "Slow garlic-infused cooking ghee."],
  ["Cardamom Dessert Ghee", "Flavoured", IMAGES.ghee, 1050, "Elaichi ghee for sweets."],
  ["Turmeric Wellness Ghee", "Wellness", IMAGES.ghee, 1020, "Lakadong turmeric stirred in."],
  ["Ashwagandha Ghee", "Wellness", IMAGES.ghee, 1180, "Traditional herbal ghee."],
  ["Ghee Residue Khurchan Jar", "By-product", IMAGES.gheeJar, 320, "Crisp milk-solid residue."],
  ["Cooking Ghee Blend", "Everyday", IMAGES.ghee, 480, "Everyday frying ghee."],
  ["Premium Granular Ghee", "Premium", IMAGES.ghee, 860, "Winter-granular texture ghee."],
  ["Summer Liquid Ghee", "Seasonal", IMAGES.ghee, 640, "Warm-climate liquid pour ghee."],
  ["Temple-style Cow Ghee", "Traditional", IMAGES.gheeJar, 920, "Short-batch lamp-and-kitchen ghee."],
  ["FPO Collective Ghee", "Collective", IMAGES.ghee, 610, "Pooled village FPO ghee."],
  ["Baby Food Mild Ghee", "Specialty", IMAGES.ghee, 950, "Very mild, extra-filtered ghee."],
  ["Smoke-point Kitchen Ghee", "Everyday", IMAGES.ghee, 560, "High-heat tadka ghee."],
  ["Brown Butter Ghee", "Specialty", IMAGES.gheeJar, 890, "Nut-brown beurre noisette style."],
  ["Goat Milk Ghee", "Specialty", IMAGES.ghee, 1120, "Rare goat-milk ghee."],
  ["Camel Milk Ghee", "Specialty", IMAGES.ghee, 1450, "Kutch camel-milk clarified fat."],
  ["Shea-free Pure Ghee", "Purity", IMAGES.ghee, 700, "Lab-tested 100% milk fat."],
  ["Festival Sweet Ghee", "Seasonal", IMAGES.gheeJar, 830, "Diwali mithai ghee."],
  ["Winter Immunity Ghee", "Seasonal", IMAGES.ghee, 960, "Pepper and dry-ginger ghee."],
  ["Cold-settled Ghee", "Process", IMAGES.ghee, 780, "Settled 48 hours before packing."],
  ["Wood-fire Ghee", "Process", IMAGES.gheeJar, 1080, "Simmered over hardwood."],
  ["Steel-vat Dairy Ghee", "Process", IMAGES.ghee, 590, "Hygienic vat ghee, consistent."],
  ["Microbatch Chef Ghee", "Premium", IMAGES.gheeJar, 1320, "Restaurant-kitchen small batch."],
];

const gheeSizes = [
  ["250 ml", 0.55, "Jar"],
  ["500 ml", 1, "Organic"],
  ["1 L", 1.9, "Tin"],
];

gheeBases.forEach(([name, sub, image, base, desc]) => {
  gheeSizes.forEach(([weight, mul, extra]) => {
    add({
      name: pack(name, weight, base * mul, extra),
      category: "Ghee",
      subCategory: sub,
      weight,
      price: base * mul,
      image,
      badge: extra === "Organic" ? "Bilona / Organic" : extra === "Tin" ? "Family tin" : "Farm packed",
      description: desc,
    });
  });
});

if (products.length !== 600) {
  throw new Error(`Expected 600 products, got ${products.length}`);
}

const byCat = {};
for (const p of products) {
  byCat[p.category] = (byCat[p.category] || 0) + 1;
}

const outJson = join(__dirname, "../src/Data/catalog.json");

writeFileSync(outJson, JSON.stringify(products, null, 2));

console.log("Wrote", products.length, "products", byCat);
console.log("Unique names", names.size);
