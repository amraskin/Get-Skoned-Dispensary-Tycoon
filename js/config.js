// ============================================================
//  GET SKONED — Dispensary Tycoon
//  config.js — All static game data
// ============================================================

const CONFIG = {
  canvas: { width: 960, height: 520 },
  game: {
    startingMoney: 500,
    shiftsPerDay: 3,
    baseCustomersPerShift: 4,
    upsellBonusPct: 0.15,   // budtender gets 15% reputation boost for successful upsell
  },
  colors: {
    floorTile:       '#E8DDD0',
    floorTileGrid:   '#D8C8B8',
    wallBg:          '#F4F0EC',
    featureWall:     '#181818',
    chalkText:       '#CCCCCC',
    counterTop:      '#F8F5F0',
    counterFront:    '#C8A87A',
    counterAccent:   '#B09060',
    shelfWood:       '#C8A878',
    archWood:        '#B89060',
    pendantOuter:    '#E08020',
    pendantInner:    '#FFB040',
    pendantGlow:     'rgba(255, 160, 30, 0.3)',
    neonGreen:       '#B8FF40',
    neonGlow:        'rgba(140, 255, 20, 0.6)',
    brandGreen:      '#2A6040',
    brandLight:      '#F0F8F0',
    textDark:        '#1A1A1A',
    textMid:         '#555555',
    money:           '#2D8A4E',
    moneyBg:         '#E8F5EE',
    upsell:          '#C86820',
    upsellBg:        '#FFF0E0',
    warning:         '#C04040',
    warningBg:       '#FFF0F0',
  }
};

// ============================================================
//  PRODUCTS
// ============================================================
//  tier 1 = starter (always unlocked)
//  tier 2 = mid (unlocked via vendors)
//  tier 3 = premium (unlocked via vendors)

const PRODUCTS = {
  flower: [
    { id:'fl1', name:'House Blend',     price:25,  cost:10, tier:1, desc:'A smooth everyday smoke.',           effect:'Mellow & Relaxing'   },
    { id:'fl2', name:'Blue Dream',      price:45,  cost:18, tier:1, desc:'Classic sativa-dominant hybrid.',    effect:'Uplifting & Creative'},
    { id:'fl3', name:'Wedding Cake',    price:65,  cost:25, tier:2, desc:'Sweet earthy indica — fan fave.',    effect:'Relaxing & Euphoric' },
    { id:'fl4', name:'Runtz',           price:85,  cost:33, tier:2, desc:'Fruity hybrid, top-shelf taste.',    effect:'Happy & Talkative'   },
    { id:'fl5', name:'Jealousy',        price:105, cost:40, tier:3, desc:'Exotic premium strain, very rare.',  effect:'Full-Body Bliss'     },
  ],
  prerolls: [
    { id:'pr1', name:'House Pre-roll',      price:8,  cost:3,  tier:1, desc:'Simple, affordable, ready to go.',     effect:'Quick & Easy'       },
    { id:'pr2', name:'Infused Pre-roll',    price:15, cost:6,  tier:1, desc:'Dusted with kief for extra kick.',     effect:'Extra Potent'       },
    { id:'pr3', name:'King Size 3-Pack',    price:28, cost:11, tier:2, desc:'Three kings — great value bundle.',    effect:'Share the Love'     },
    { id:'pr4', name:'PUFF Infused King',   price:38, cost:15, tier:2, desc:'Premium infused king-size.',           effect:'Long-Lasting High'  },
    { id:'pr5', name:'Diamond Infused',     price:55, cost:21, tier:3, desc:'Coated in THCa diamonds & sauce.',     effect:'Next Level'         },
  ],
  edibles: [
    { id:'ed1', name:'Gummies 10mg',        price:15, cost:5,  tier:1, desc:'Perfect for beginners.',               effect:'Mild & Pleasant'    },
    { id:'ed2', name:'Chocolate Bar 50mg',  price:25, cost:9,  tier:1, desc:'Classic infused chocolate.',           effect:'Smooth & Mellow'    },
    { id:'ed3', name:'Premium Gummies 100mg',price:42, cost:16, tier:2, desc:'Full-spectrum, artisan gummies.',     effect:'Deep Relaxation'    },
    { id:'ed4', name:'Nano Gummies 200mg',  price:58, cost:22, tier:2, desc:'Fast-acting nano technology.',         effect:'Fast & Powerful'    },
    { id:'ed5', name:'Luxury Chocolate Box',price:85, cost:32, tier:3, desc:'Artisan multi-flavor collection.',     effect:'Indulgent Bliss'    },
  ],
  vapes: [
    { id:'vp1', name:'500mg Cartridge',     price:35, cost:13, tier:1, desc:'Affordable entry-level cart.',         effect:'Smooth & Discreet'  },
    { id:'vp2', name:'1g Cartridge',        price:55, cost:21, tier:1, desc:'Full-gram, great everyday value.',     effect:'Long-Lasting'       },
    { id:'vp3', name:'Live Resin Cart',     price:78, cost:30, tier:2, desc:'Full-spectrum live resin flavor.',     effect:'Flavorful & Potent' },
    { id:'vp4', name:'Rosin Cartridge',     price:98, cost:38, tier:2, desc:'Solventless rosin — top quality.',    effect:'Pure & Powerful'    },
    { id:'vp5', name:'All-In-One Device',   price:125,cost:48, tier:3, desc:'Premium disposable device.',          effect:'Convenience & Power'},
  ],
  concentrate: [
    { id:'cn1', name:'Live Resin 1g',       price:45, cost:17, tier:1, desc:'Classic live resin extract.',          effect:'Flavorful & Potent' },
    { id:'cn2', name:'Badder 1g',           price:65, cost:25, tier:1, desc:'Smooth, creamy consistency.',          effect:'Balanced & Smooth'  },
    { id:'cn3', name:'Sugar Wax 1g',        price:78, cost:30, tier:2, desc:'Crystalline sugar-wax texture.',       effect:'Intense & Clear'    },
    { id:'cn4', name:'Live Rosin 1g',       price:95, cost:36, tier:2, desc:'Solventless, top-tier extract.',       effect:'Rich & Full'        },
    { id:'cn5', name:'Diamonds & Sauce',    price:125,cost:48, tier:3, desc:'Pure THCa diamonds in terpene sauce.', effect:'Maximum Potency'    },
  ],

  // ── BSkone Bongs ── handcrafted glass pieces (see display case)
  bskone_bongs: [
    { id:'bk1', name:'BSkone Mini',          price:45,  cost:18, tier:1, desc:'Compact 6" clear glass starter piece.',         effect:'Quick & Smooth'      },
    { id:'bk2', name:'BSkone Classic Beaker',price:95,  cost:38, tier:1, desc:'Timeless 10" beaker base, everyday reliable.',   effect:'Cool & Filtered'     },
    { id:'bk3', name:'BSkone Artisan Tube',  price:150, cost:58, tier:2, desc:'12" hand-blown colored borosilicate glass.',     effect:'Rich & Buttery'      },
    { id:'bk4', name:'BSkone Signature',     price:220, cost:85, tier:2, desc:'14" artist-colored statement piece.',            effect:'Showroom Quality'    },
    { id:'bk5', name:'BSkone Grand Artist',  price:320, cost:124,tier:3, desc:'18" large-format collector\'s masterpiece.',     effect:'The Ultimate Piece'  },
  ],
};

const CATEGORY_META = {
  flower:       { label:'Flower',        icon:'🌿', color:'#4A8A40' },
  prerolls:     { label:'Pre-rolls',     icon:'🪄', color:'#8A6A30' },
  edibles:      { label:'Edibles',       icon:'🍬', color:'#C04080' },
  vapes:        { label:'Vapes',         icon:'💨', color:'#3080B0' },
  concentrate:  { label:'Concentrate',   icon:'💎', color:'#6840A0' },
  bskone_bongs: { label:'BSkone Bongs',  icon:'🏺', color:'#9B6520' },
};

// ============================================================
//  ADD-ONS  (items near the register)
// ============================================================
const ADDONS = [
  { id:'ao1', name:'Rolling Papers',   price:3,   cost:1,   icon:'📄', desc:'Classic RAW papers.',         alwaysUnlocked:true  },
  { id:'ao2', name:'Lighter',          price:2,   cost:0.5, icon:'🔥', desc:'Clipper full-color lighter.', alwaysUnlocked:true  },
  { id:'ao3', name:'Grinder',          price:15,  cost:5,   icon:'⚙️', desc:'2-piece aluminum grinder.',   alwaysUnlocked:true  },
  { id:'ao4', name:'Vape Battery',     price:22,  cost:8,   icon:'🔋', desc:'510-thread vape battery.',    alwaysUnlocked:false, vendorRequired:'vn2' },
  { id:'ao5', name:'Smell-Proof Bag',  price:10,  cost:3,   icon:'👜', desc:'Odor-blocking zip bag.',       alwaysUnlocked:false, vendorRequired:'vn1' },
  { id:'ao6', name:'Glass Pipe',       price:28,  cost:10,  icon:'🫧', desc:'Borosilicate hand pipe.',      alwaysUnlocked:false, vendorRequired:'vn3' },
  { id:'ao7', name:'Dab Rig',          price:65,  cost:24,  icon:'🧪', desc:'Compact dab rig kit.',         alwaysUnlocked:false, vendorRequired:'vn4' },
  { id:'ao8', name:'Pre-roll Caddy',   price:18,  cost:6,   icon:'📦', desc:'Stylish pre-roll holder.',     alwaysUnlocked:false, vendorRequired:'vn1' },
];

// ============================================================
//  VENDORS
// ============================================================
const VENDORS = [
  {
    id: 'vn1',
    name: 'Florist Fridays',
    tagline: 'Local craft grower, beloved by regulars',
    cost: 600,
    available: true,
    unlocked: false,
    unlocks: {
      products: ['fl3','fl4','pr3','pr4'],
      addons: ['ao5','ao8'],
    },
    customerBoostPerDay: 2,
    reputationBoost: 5,
    avatar: '🌸',
    pitch: 'We grow small-batch, sun-kissed flower. Your customers will love Wedding Cake and Runtz.',
  },
  {
    id: 'vn2',
    name: 'Cloud Nine Extracts',
    tagline: 'Premium vapes & concentrates',
    cost: 800,
    available: true,
    unlocked: false,
    unlocks: {
      products: ['vp3','vp4','cn3','cn4'],
      addons: ['ao4'],
    },
    customerBoostPerDay: 2,
    reputationBoost: 8,
    avatar: '☁️',
    pitch: 'Our live resin and rosin carts are selling out everywhere. Get them before competitors do.',
  },
  {
    id: 'vn3',
    name: 'Happy Bakers Co.',
    tagline: 'Artisan infused edibles',
    cost: 700,
    available: true,
    unlocked: false,
    unlocks: {
      products: ['ed3','ed4','ed5'],
      addons: ['ao6'],
    },
    customerBoostPerDay: 3,
    reputationBoost: 6,
    avatar: '🧁',
    pitch: 'Nano gummies and luxury chocolates bring in an entirely new customer segment.',
  },
  {
    id: 'vn4',
    name: 'Premium Cultivars',
    tagline: 'Exotic top-shelf genetics',
    cost: 1800,
    available: false,
    unlocksAfterDay: 5,
    unlocked: false,
    unlocks: {
      products: ['fl5','pr5','vp5'],
      addons: ['ao7'],
    },
    customerBoostPerDay: 4,
    reputationBoost: 15,
    avatar: '🏆',
    pitch: 'Jealousy and Diamond Infused pre-rolls — exclusive access for select dispensaries.',
  },
  {
    id: 'vn5',
    name: 'Apex Concentrates',
    tagline: 'The pinnacle of extraction',
    cost: 2500,
    available: false,
    unlocksAfterDay: 8,
    unlocked: false,
    unlocks: {
      products: ['cn5'],
      addons: [],
    },
    customerBoostPerDay: 5,
    reputationBoost: 20,
    avatar: '💎',
    pitch: 'Diamonds & Sauce. Nothing else like it. Your most loyal customers will keep coming back.',
  },
  {
    id: 'vn6',
    name: 'BSkone Glass Works',
    tagline: 'Premium handcrafted glass pieces — local artisans',
    cost: 950,
    available: true,
    unlocked: false,
    unlocks: {
      products: ['bk3','bk4','bk5'],
      addons: [],
    },
    customerBoostPerDay: 3,
    reputationBoost: 12,
    avatar: '🏺',
    pitch: 'Our artisan bongs bring in collectors and connoisseurs you\'ve never seen before. The Grand Artist piece alone brings people in from out of town.',
  },
];

// ============================================================
//  MARKETING CAMPAIGNS
// ============================================================
const MARKETING = [
  {
    id: 'mk1',
    name: 'Instagram Post',
    icon: '📸',
    cost: 150,
    desc: 'Feature your products on social — quick bump in foot traffic.',
    customerBoostPerDay: 2,
    durationDays: 3,
    reputationBoost: 2,
    tier: 1,
  },
  {
    id: 'mk2',
    name: 'Loyalty Card Program',
    icon: '💳',
    cost: 400,
    desc: 'Punch cards bring customers back. Permanent small boost.',
    customerBoostPerDay: 2,
    durationDays: 9999, // permanent
    reputationBoost: 5,
    tier: 1,
  },
  {
    id: 'mk3',
    name: 'Influencer Partnership',
    icon: '🎤',
    cost: 600,
    desc: 'Local cannabis influencer features your shop for 5 days.',
    customerBoostPerDay: 4,
    durationDays: 5,
    reputationBoost: 8,
    tier: 2,
  },
  {
    id: 'mk4',
    name: 'Local Billboard',
    icon: '🪧',
    cost: 1200,
    desc: 'Highway billboard visible to thousands. Week-long traffic surge.',
    customerBoostPerDay: 6,
    durationDays: 7,
    reputationBoost: 10,
    tier: 2,
  },
  {
    id: 'mk5',
    name: 'Grand In-Store Event',
    icon: '🎸',
    cost: 2200,
    desc: 'Live music, demos, giveaways — turns shoppers into fans. Huge reputation boost.',
    customerBoostPerDay: 10,
    durationDays: 3,
    reputationBoost: 25,
    tier: 3,
  },
];

// ============================================================
//  CUSTOMER TYPES
// ============================================================
const CUSTOMER_TYPES = [
  {
    type: 'budget',
    label: 'Budget Shopper',
    desc: 'Knows exactly what they want and won\'t go over budget.',
    upsellChance: 0.05,
    addonChance: 0.15,
    budgetMultiplier: 0.8,   // their budget is 80% of tier-1 price
    color: '#7090A8',
    outfits: ['👕', '🧢'],
    frequency: 0.30,
  },
  {
    type: 'curious',
    label: 'Curious Explorer',
    desc: 'Open to suggestions and new experiences.',
    upsellChance: 0.40,
    addonChance: 0.45,
    budgetMultiplier: 1.2,
    color: '#78A870',
    outfits: ['🧥', '👒'],
    frequency: 0.35,
  },
  {
    type: 'enthusiast',
    label: 'Cannabis Enthusiast',
    desc: 'Loves premium products. Happy to spend more for quality.',
    upsellChance: 0.65,
    addonChance: 0.60,
    budgetMultiplier: 1.6,
    color: '#A07840',
    outfits: ['🥼', '🎩'],
    frequency: 0.25,
  },
  {
    type: 'highroller',
    label: 'High Roller',
    desc: 'Only wants the best. Will always take the premium option.',
    upsellChance: 0.90,
    addonChance: 0.75,
    budgetMultiplier: 2.2,
    color: '#A06088',
    outfits: ['🥻', '🎓'],
    frequency: 0.10,
  },
];

const CUSTOMER_NAMES = [
  'Alex','Jordan','Morgan','Taylor','Casey','Riley','Quinn','Drew',
  'Sam','Jamie','Avery','Blake','Cameron','Dallas','Emery','Finley',
  'Harper','Hayden','Jesse','Kai','Lane','Logan','Mackenzie','Parker',
  'Peyton','Reese','River','Rowan','Sage','Skylar','Spencer','Tatum',
];

const CUSTOMER_DIALOGUES = {
  budget: [
    "Just need something simple today.",
    "My usual, please — nothing fancy.",
    "What's your best deal right now?",
    "Looking for something affordable.",
  ],
  curious: [
    "What would you recommend?",
    "I'm trying to branch out a bit.",
    "Heard good things about this place!",
    "Open to suggestions — surprise me.",
  ],
  enthusiast: [
    "Looking for something premium.",
    "What's your top-shelf selection?",
    "I really appreciate quality.",
    "Any new strains come in lately?",
  ],
  highroller: [
    "Only the best, please.",
    "Show me your finest.",
    "Money is no object — quality is.",
    "I heard you carry exclusive products?",
  ],
};

const UPSELL_LINES = [
  "Actually, for just $X more you get the {name}…",
  "If you like that, you'd love the {name}. Only $X more.",
  "Our customers rave about the {name} — want to try it?",
  "Between us, the {name} is where it's really at.",
];

// ============================================================
//  CONVERSATION SYSTEM — vague opening lines & effect hints
// ============================================================

const CUSTOMER_VAGUE_DIALOGUES = {
  budget: [
    "Just stopping by to check things out.",
    "My buddy sent me — said this is the spot.",
    "Need something for tonight.",
    "Quick stop on my way home.",
  ],
  curious: [
    "First time here! This place looks amazing.",
    "A friend wouldn't stop talking about Skones.",
    "Saw you guys on Instagram — had to come in.",
    "Just moved to the area, still exploring.",
  ],
  enthusiast: [
    "I've been looking for a quality shop around here.",
    "Heard you carry some interesting inventory.",
    "I know what I like when I find it.",
    "Been doing my research on local spots.",
  ],
  highroller: [
    "A colleague spoke highly of this establishment.",
    "I'm rather particular about where I shop.",
    "Looking to add to my collection today.",
    "Word travels fast in the right circles.",
  ],
};

const CATEGORY_EFFECT_HINTS = {
  flower:       [
    "Something to smoke — looking to vibe out tonight.",
    "A good smoke to unwind after a long day.",
    "Want to roll something nice, you know?",
  ],
  prerolls:     [
    "Something ready to go — I don't want to prep anything.",
    "Already rolled is ideal. In and out.",
    "Convenient, no setup, just spark and go.",
  ],
  edibles:      [
    "I'd rather eat something today, honestly.",
    "Something I can take on the go — not trying to smoke.",
    "Want longer, more mellow effects — eat it.",
  ],
  vapes:        [
    "Need something discreet — always on the move.",
    "Small, portable, no smell. That's my vibe.",
    "Something I can use anywhere, low-key.",
  ],
  concentrate:  [
    "Got a high tolerance, I need something serious.",
    "I dab — what do you have for that?",
    "Looking for something for my rig at home.",
  ],
  bskone_bongs: [
    "Actually looking to invest in a nice piece.",
    "Want something I can display and use at home.",
    "A friend has one of your bongs — I want one.",
  ],
};
