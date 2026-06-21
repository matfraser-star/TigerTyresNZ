'use strict';
const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tigertyres.db');
let db;
function getDb() {
  if (!db) { db = new Database(DB_PATH); db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); }
  return db;
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tyres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL, model TEXT NOT NULL,
      width INTEGER NOT NULL, profile INTEGER NOT NULL, rim INTEGER NOT NULL,
      condition TEXT NOT NULL DEFAULT 'New' CHECK(condition IN ('New','Used')),
      price REAL NOT NULL, qty INTEGER NOT NULL DEFAULT 0,
      speed TEXT NOT NULL DEFAULT 'V', load_index INTEGER NOT NULL DEFAULT 91,
      description TEXT, image_url TEXT, warranty TEXT,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
      message TEXT, items_json TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new','contacted','completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tyre_id INTEGER NOT NULL REFERENCES tyres(id) ON DELETE CASCADE,
      author TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      body TEXT, approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
      service TEXT NOT NULL, vehicle TEXT,
      date TEXT NOT NULL, time TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL, model TEXT NOT NULL, year INTEGER NOT NULL,
      width INTEGER NOT NULL, profile INTEGER NOT NULL, rim INTEGER NOT NULL,
      notes TEXT
    );
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_tyre_ts AFTER UPDATE ON tyres
    BEGIN UPDATE tyres SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
  `);

  // Default admin
  if (!db.prepare('SELECT id FROM admins WHERE username=?').get('tiger')) {
    db.prepare('INSERT INTO admins (username,password_hash) VALUES (?,?)').run('tiger', bcrypt.hashSync('tiger123',10));
    console.log('✅  Admin: tiger / tiger123');
  }

  // Settings
  const defaults = {
    shop_name:'Tiger Tyres', phone:'06 835 0000', email:'info@tigertyres.co.nz',
    address:'123 Carlyle Street, Napier 4110, New Zealand', gst:'123-456-789',
    whatsapp:'6468350000', instagram:'', maps_embed:'',
    hours_weekday:'Mon–Fri: 8am – 5:30pm', hours_sat:'Saturday: 8:30am – 3pm', hours_sun:'Sunday: Closed',
    price_match:'true',
    smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', notify_email:'',
    hero_eyebrow:"NAPIER'S TYRE SPECIALISTS",
    hero_heading:'FIND YOUR', hero_heading_highlight:'PERFECT TYRE',
    hero_subtext:"22-inch 285/40s down to budget second-hand — every size, every budget.",
    hero_badge_text:"PRICE MATCH GUARANTEE — Show us any quote, we'll beat it",
    hero_logo_url:'',
    footer_tagline:'Premium & budget tyres for every vehicle. Fitting available 6 days a week.',
    about_text1:"Tiger Tyres has been Hawke's Bay's trusted tyre specialist for over 15 years. From budget second-hand tyres to premium 22\" performance rubber — we stock it all and fit it fast.",
    about_text2:'Our experienced team handles everything from everyday hatchbacks to high-performance sports cars. We price-match any written quote.',
    fitting_fee:'0', show_fitted_price:'false',
    booking_open_days:'1111110',
    booking_open_time:'08:00', booking_close_time:'17:00',
    booking_slot_minutes:'60', booking_buffer_minutes:'0',
  };
  const ups = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  for (const [k,v] of Object.entries(defaults)) ups.run(k,v);

  // ── Seed tyres ──────────────────────────────────────────────────────
  if (!db.prepare('SELECT COUNT(*) as c FROM tyres').get().c) {
    const ins = db.prepare(`INSERT INTO tyres (brand,model,width,profile,rim,condition,price,qty,speed,load_index,description,warranty,featured)
      VALUES (@brand,@model,@width,@profile,@rim,@condition,@price,@qty,@speed,@load_index,@description,@warranty,@featured)`);
    const seed = [
      // Premium new performance
      {brand:'Michelin',model:'Pilot Sport 5',width:285,profile:40,rim:22,condition:'New',price:420,qty:4,speed:'Y',load_index:106,description:'Ultra-high-performance summer tyre. Exceptional dry and wet grip. OE on Porsche, BMW M.',warranty:'5 year manufacturer warranty',featured:1},
      {brand:'Pirelli',model:'P Zero PZ4',width:275,profile:35,rim:21,condition:'New',price:390,qty:2,speed:'Y',load_index:103,description:'OEM fitment for Ferrari & Lamborghini. Razor-sharp handling.',warranty:'5 year manufacturer warranty',featured:1},
      {brand:'Continental',model:'SportContact 7',width:265,profile:35,rim:20,condition:'New',price:310,qty:6,speed:'Y',load_index:99,description:'Track-tested performance with outstanding longevity.',warranty:'5 year manufacturer warranty',featured:1},
      {brand:'Bridgestone',model:'Potenza Sport',width:245,profile:45,rim:19,condition:'New',price:270,qty:8,speed:'Y',load_index:98,description:'Balanced high-performance with excellent wet weather confidence.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Michelin',model:'Pilot Sport 4 SUV',width:235,profile:55,rim:19,condition:'New',price:285,qty:6,speed:'Y',load_index:105,description:'Performance SUV tyre. OE on RAV4 Limited, Tucson N-Line, Kia Sportage GT.',warranty:'5 year manufacturer warranty',featured:1},
      // All-season / touring new
      {brand:'Bridgestone',model:'Turanza T005',width:225,profile:65,rim:17,condition:'New',price:165,qty:12,speed:'V',load_index:102,description:'OE fitment on Toyota RAV4 LE/XLE. Quiet, comfortable, excellent wet braking.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Michelin',model:'Primacy 4+',width:225,profile:65,rim:17,condition:'New',price:185,qty:8,speed:'V',load_index:102,description:'Long-lasting touring tyre with top-rated wet safety. Fits RAV4, Corolla Cross, Yaris Cross.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Bridgestone',model:'Turanza T005',width:215,profile:55,rim:17,condition:'New',price:148,qty:10,speed:'V',load_index:94,description:'Smooth, quiet touring tyre. Common on Camry, Mazda3, i30, Cerato.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Yokohama',model:'Advan Sport V107',width:255,profile:40,rim:20,condition:'New',price:255,qty:4,speed:'Y',load_index:101,description:'Japanese engineering meets European performance standards.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Continental',model:'UltraContact UC7',width:205,profile:55,rim:16,condition:'New',price:138,qty:14,speed:'V',load_index:91,description:'Excellent wet grip and fuel efficiency. Fits Suzuki Swift, VW Polo, i30, Civic.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Dunlop',model:'Sport Maxx RT2',width:225,profile:45,rim:18,condition:'New',price:195,qty:10,speed:'W',load_index:95,description:'High-performance everyday tyre. Fits Hyundai i30 N, Subaru WRX, VW Golf GTI.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Pirelli',model:'Cinturato P7 C2',width:205,profile:55,rim:16,condition:'New',price:148,qty:12,speed:'V',load_index:91,description:'Eco-focused touring tyre, low rolling resistance. Fits Corolla, i30, Cerato.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Hankook',model:'Kinergy GT',width:215,profile:60,rim:16,condition:'New',price:125,qty:8,speed:'H',load_index:95,description:'Comfortable touring tyre with low road noise. Fits Honda Jazz, Toyota Noah, Nissan Note.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Toyo',model:'Proxes CF2',width:185,profile:60,rim:15,condition:'New',price:108,qty:12,speed:'H',load_index:84,description:'Quiet, comfortable everyday tyre. Fits Suzuki Swift, Toyota Yaris, Honda Fit.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Nexen',model:'N\'Blue HD Plus',width:195,profile:65,rim:15,condition:'New',price:92,qty:16,speed:'H',load_index:91,description:'Budget-friendly everyday tyre. Good wet and dry performance. Fits Corolla, Yaris, Note.',warranty:'3 year manufacturer warranty',featured:0},
      {brand:'Kumho',model:'Ecsta PS71',width:225,profile:45,rim:18,condition:'New',price:155,qty:8,speed:'W',load_index:95,description:'High-performance tyre at an accessible price. Fits Hyundai i30N, WRX, Golf GTI.',warranty:'3 year manufacturer warranty',featured:0},
      // SUV sizes - common NZ
      {brand:'Bridgestone',model:'Alenza 001',width:235,profile:55,rim:19,condition:'New',price:245,qty:8,speed:'V',load_index:105,description:'Premium SUV touring tyre. OE on RAV4 Limited/Adventure. Quiet and long-lasting.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Michelin',model:'Latitude Tour HP',width:225,profile:60,rim:18,condition:'New',price:215,qty:6,speed:'H',load_index:100,description:'Premium SUV tyre. Fits RAV4 Prime PHEV, Subaru Outback, Forester.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Continental',model:'CrossContact LX25',width:215,profile:55,rim:17,condition:'New',price:185,qty:10,speed:'V',load_index:94,description:'Excellent all-season SUV tyre. Fits Mitsubishi ASX, Kia Seltos, Vitara, Yaris Cross.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Yokohama',model:'Geolandar G058',width:235,profile:55,rim:19,condition:'New',price:235,qty:6,speed:'V',load_index:105,description:'Premium SUV tyre. Fits RAV4 Limited, CX-5 Akera, Tucson Elite, Sportage GT.',warranty:'4 year manufacturer warranty',featured:0},
      // 4WD / ute all-terrain
      {brand:'Falken',model:'Wildpeak AT3W',width:265,profile:65,rim:17,condition:'New',price:235,qty:6,speed:'T',load_index:112,description:'All-terrain tyre built for Ranger XL/XLS, Hilux SR, D-Max base, BT-50 XS. Excellent off-road.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'BF Goodrich',model:'All-Terrain T/A KO2',width:265,profile:70,rim:17,condition:'New',price:320,qty:4,speed:'T',load_index:112,description:'The benchmark all-terrain tyre. Fits Hilux, Ranger, Triton, D-Max, Navara on 17".',warranty:'5 year manufacturer warranty',featured:1},
      {brand:'Michelin',model:'LTX Force',width:265,profile:65,rim:17,condition:'New',price:278,qty:4,speed:'T',load_index:112,description:'Premium all-season ute/SUV tyre. Fits Ranger XL/XLS, Hilux SR, Triton, D-Max.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Yokohama',model:'Geolandar A/T G015',width:265,profile:60,rim:18,condition:'New',price:258,qty:6,speed:'H',load_index:110,description:'All-terrain SUV tyre. Fits Ranger XLT/Wildtrak 18", Hilux Rogue, Fortuner.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Dunlop',model:'Grandtrek AT5',width:255,profile:65,rim:17,condition:'New',price:218,qty:8,speed:'H',load_index:110,description:'Highway terrain tyre for SUV/4WD. Fits Prado GX/GXL 17", Land Cruiser 200, Patrol.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Hankook',model:'Dynapro AT2',width:265,profile:60,rim:18,condition:'New',price:195,qty:8,speed:'H',load_index:110,description:'All-terrain tyre for utes and SUVs. Fits Ranger XLT 18", GWM Ute, Mazda BT-50.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Toyo',model:'Open Country A/T III',width:265,profile:65,rim:17,condition:'New',price:225,qty:6,speed:'T',load_index:112,description:'Rugged all-terrain with road-biased compound. Fits Hilux, Ranger, Triton, D-Max.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'BF Goodrich',model:'All-Terrain T/A KO2',width:285,profile:70,rim:17,condition:'New',price:355,qty:4,speed:'S',load_index:121,description:'Ranger Raptor OE spec. Also fits Wrangler Rubicon, lifted Hilux/Ranger builds.',warranty:'5 year manufacturer warranty',featured:0},
      // Large SUV / 20"
      {brand:'Bridgestone',model:'Alenza 001',width:285,profile:60,rim:18,condition:'New',price:295,qty:4,speed:'V',load_index:116,description:'OE on Land Cruiser 300 GX/VX, Patrol Ti, Prado VX. Premium highway SUV tyre.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Michelin',model:'Pilot Sport 4 SUV',width:255,profile:55,rim:20,condition:'New',price:310,qty:4,speed:'V',load_index:110,description:'Performance SUV. Fits Ranger Wildtrak 20", Everest Platinum, Amarok V6, VW Tiguan top.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Continental',model:'CrossContact RX',width:255,profile:50,rim:20,condition:'New',price:295,qty:4,speed:'V',load_index:109,description:'Premium 20" SUV tyre. Fits Defender, Discovery, Range Rover Evoque, Sorento.',warranty:'4 year manufacturer warranty',featured:0},
      // EV specific
      {brand:'Michelin',model:'Pilot Sport EV',width:235,profile:40,rim:18,condition:'New',price:285,qty:6,speed:'Y',load_index:95,description:'OE on Tesla Model 3 Highland (2023+). Acoustic foam, low rolling resistance, extended wear.',warranty:'5 year manufacturer warranty',featured:1},
      {brand:'Pirelli',model:'P Zero Elect',width:235,profile:45,rim:19,condition:'New',price:295,qty:4,speed:'Y',load_index:99,description:'EV-rated tyre for Tesla Model Y, BYD Seal, Hyundai IONIQ 5. Noise-reducing foam liner.',warranty:'5 year manufacturer warranty',featured:0},
      {brand:'Bridgestone',model:'Turanza Eco',width:215,profile:55,rim:18,condition:'New',price:225,qty:6,speed:'V',load_index:99,description:'OE on BYD Atto 3, Nissan Leaf. Fuel-efficient, low noise, suited to EV weight.',warranty:'4 year manufacturer warranty',featured:0},
      {brand:'Continental',model:'EcoContact 6',width:215,profile:50,rim:17,condition:'New',price:185,qty:8,speed:'W',load_index:95,description:'EV-optimised touring tyre. Fits Nissan Leaf, MG ZS EV, BYD Dolphin.',warranty:'4 year manufacturer warranty',featured:0},
      // Budget
      {brand:'Kumho',model:'Solus TA21',width:185,profile:65,rim:15,condition:'New',price:88,qty:12,speed:'T',load_index:88,description:'Reliable everyday budget tyre. Fits Toyota Yaris, Suzuki Baleno, Honda Fit, Nissan Note.',warranty:'3 year manufacturer warranty',featured:0},
      {brand:'Nexen',model:'N\'Priz AH8',width:205,profile:60,rim:16,condition:'New',price:102,qty:10,speed:'H',load_index:92,description:'Good value touring tyre. Fits Honda Jazz, Freed, Mazda Demio, Suzuki Swift 2024.',warranty:'3 year manufacturer warranty',featured:0},
      // Used
      {brand:'Michelin',model:'Primacy 4',width:225,profile:65,rim:17,condition:'Used',price:75,qty:4,speed:'V',load_index:102,description:'Used — 5.5mm tread. Late-model RAV4 LE/XLE takeoffs. Great condition for the price.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Bridgestone',model:'Turanza T005',width:225,profile:45,rim:18,condition:'Used',price:70,qty:4,speed:'W',load_index:95,description:'Used — 5mm tread. Camry/i30/Cerato takeoffs. OE fitment, excellent shape.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Yokohama',model:'Geolandar G058',width:235,profile:55,rim:19,condition:'Used',price:95,qty:2,speed:'V',load_index:105,description:'Used — 6mm tread. RAV4 Limited / CX-5 Akera takeoffs. Like new condition.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Goodyear',model:'Eagle F1 Asymm 5',width:235,profile:40,rim:19,condition:'Used',price:90,qty:2,speed:'Y',load_index:96,description:'Used — 6mm tread. Great shape for the price.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Falken',model:'FK510',width:215,profile:50,rim:17,condition:'Used',price:65,qty:4,speed:'W',load_index:91,description:'Used — 5.5mm tread remaining.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Bridgestone',model:'Alenza 001',width:265,profile:65,rim:17,condition:'Used',price:80,qty:4,speed:'T',load_index:112,description:'Used — 5mm tread. Hilux/Ranger ute takeoffs. Good all-terrain shape.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Continental',model:'CrossContact LX25',width:215,profile:55,rim:17,condition:'Used',price:65,qty:4,speed:'V',load_index:94,description:'Used — 5.5mm tread. ASX / Vitara / Seltos takeoffs.',warranty:'No warranty — used tyre',featured:0},
      {brand:'Michelin',model:'Pilot Sport 4 SUV',width:235,profile:55,rim:19,condition:'Used',price:110,qty:2,speed:'V',load_index:105,description:'Used — 7mm tread. Nearly new RAV4 Limited takeoffs.',warranty:'No warranty — used tyre',featured:0},
    ];
    db.transaction(rows => rows.forEach(r => ins.run(r)))(seed);
    console.log('✅  Seeded', seed.length, 'tyres');
  }

  // ── Vehicle fitment database ──────────────────────────────────────
  // ALL sizes verified from wheel-size.com, carsguide.com.au, manufacturer specs
  // NZ-spec (Oceania region) where it differs from global spec
  if (!db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c) {
    const ins = db.prepare('INSERT INTO vehicles (make,model,year,width,profile,rim,notes) VALUES (?,?,?,?,?,?,?)');
    const vehicles = [

      // ═══ TOYOTA ═══════════════════════════════════════════════════

      // RAV4 Gen 5 (XA50) 2019-2025 — verified wheel-size.com & comparemytires.com
      // NZ LE/XLE base: 225/65R17 | NZ GXL/Cruiser: 235/55R19
      ['Toyota','RAV4',2025,225,65,17,'LE/GX base — 17" alloy'],
      ['Toyota','RAV4',2025,235,55,19,'GXL/Cruiser/Adventure — 19" alloy'],
      ['Toyota','RAV4',2024,225,65,17,'GX base — 17" alloy'],
      ['Toyota','RAV4',2024,235,55,19,'GXL/Cruiser — 19" alloy'],
      ['Toyota','RAV4',2023,225,65,17,'GX base — 17" alloy'],
      ['Toyota','RAV4',2023,235,55,19,'GXL/Cruiser/TRD — 19" alloy'],
      ['Toyota','RAV4',2022,225,65,17,'GX base — 17" alloy'],
      ['Toyota','RAV4',2022,235,55,19,'GXL/Cruiser — 19" alloy'],
      ['Toyota','RAV4',2021,225,65,17,'GX base — 17" alloy'],
      ['Toyota','RAV4',2021,235,55,19,'GXL/Cruiser — 19" alloy'],
      ['Toyota','RAV4',2020,225,65,17,'GX base — 17" alloy'],
      ['Toyota','RAV4',2020,235,55,19,'GXL/Cruiser — 19" alloy'],
      ['Toyota','RAV4',2019,225,65,17,'GX base — 17" alloy'],
      // RAV4 Hybrid — same as ICE by trim
      ['Toyota','RAV4 Hybrid',2024,225,65,17,'GX Hybrid base'],
      ['Toyota','RAV4 Hybrid',2024,235,55,19,'GXL/Cruiser Hybrid'],
      ['Toyota','RAV4 Hybrid',2023,225,65,17,'GX Hybrid'],
      ['Toyota','RAV4 Hybrid',2023,235,55,19,'GXL/Cruiser Hybrid'],
      ['Toyota','RAV4 Hybrid',2022,225,65,17,'GX Hybrid'],
      ['Toyota','RAV4 Hybrid',2022,235,55,19,'GXL Hybrid'],
      // RAV4 Prime PHEV — unique 225/60R18
      ['Toyota','RAV4 Prime',2024,225,60,18,'PHEV — unique 18" size, all trims'],
      ['Toyota','RAV4 Prime',2023,225,60,18,'PHEV — unique 18" size'],
      ['Toyota','RAV4 Prime',2022,225,60,18,'PHEV — unique 18" size'],

      // Hilux Gen 8 (2015-2025) NZ verified
      // SR/SR5/WorkMate: 265/65R17 | Rogue/Rugged X: 265/60R18
      ['Toyota','Hilux',2025,265,65,17,'SR/SR5 — OE 265/65R17 Bridgestone Dueler'],
      ['Toyota','Hilux',2024,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux',2023,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux',2022,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux',2021,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux',2020,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux',2019,265,65,17,'SR/SR5 — OE 265/65R17'],
      ['Toyota','Hilux Rogue',2025,265,60,18,'Rogue/Rugged X — 18" alloy'],
      ['Toyota','Hilux Rogue',2024,265,60,18,'Rogue — 18" alloy'],
      ['Toyota','Hilux Rogue',2023,265,60,18,'Rogue — 18" alloy'],
      ['Toyota','Hilux Rogue',2022,265,60,18,'Rogue — 18" alloy'],

      // Yaris Cross (MXPB) 2021-2025 — 195/60R17 all trims
      ['Toyota','Yaris Cross',2025,195,60,17,'GX/GXL — OE 195/60R17'],
      ['Toyota','Yaris Cross',2024,195,60,17,'GX/GXL — OE 195/60R17'],
      ['Toyota','Yaris Cross',2023,195,60,17,'GX/GXL — OE 195/60R17'],
      ['Toyota','Yaris Cross',2022,195,60,17,'GX/GXL — OE 195/60R17'],
      ['Toyota','Yaris Cross',2021,195,60,17,'Launch year'],

      // Yaris hatch (XP210) 2020-2025
      ['Toyota','Yaris',2025,185,60,15,'GX — OE 185/60R15 on 15" steel/alloy'],
      ['Toyota','Yaris',2024,185,60,15,'GX — OE 185/60R15'],
      ['Toyota','Yaris',2023,185,60,15,'GX'],
      ['Toyota','Yaris',2022,185,60,15,'GX'],
      ['Toyota','Yaris',2021,185,60,15,'GX — new gen launch NZ'],

      // Corolla (E210) 2019-2025 — 205/55R16 all NZ trims
      ['Toyota','Corolla',2025,205,55,16,'Ascent/GX sedan & hatch — OE 205/55R16'],
      ['Toyota','Corolla',2024,205,55,16,'Ascent/GX/ZR — OE 205/55R16'],
      ['Toyota','Corolla',2023,205,55,16,'Ascent/GX/ZR — OE 205/55R16'],
      ['Toyota','Corolla',2022,205,55,16,'Ascent/GX/ZR — OE 205/55R16'],
      ['Toyota','Corolla',2021,205,55,16,'OE 205/55R16'],
      ['Toyota','Corolla',2020,205,55,16,'OE 205/55R16'],
      ['Toyota','Corolla',2019,205,55,16,'New gen launch'],
      // Corolla Hybrid — same as ICE
      ['Toyota','Corolla Hybrid',2025,205,55,16,'Hybrid — same size as ICE'],
      ['Toyota','Corolla Hybrid',2024,205,55,16,'Hybrid'],
      ['Toyota','Corolla Hybrid',2023,205,55,16,'Hybrid'],

      // Corolla Cross (2022-2025) — 225/50R18
      ['Toyota','Corolla Cross',2025,225,50,18,'GX/GXL — OE 225/50R18'],
      ['Toyota','Corolla Cross',2024,225,50,18,'GX/GXL — OE 225/50R18'],
      ['Toyota','Corolla Cross',2023,225,50,18,'GX/GXL — OE 225/50R18'],
      ['Toyota','Corolla Cross',2022,225,50,18,'NZ launch year'],

      // Camry (XV70) 2018-2025 — 215/55R17 NZ
      ['Toyota','Camry',2025,215,55,17,'Ascent/SL — OE 215/55R17'],
      ['Toyota','Camry',2024,215,55,17,'Ascent/SL — OE 215/55R17'],
      ['Toyota','Camry',2023,215,55,17,'Ascent/SL — OE 215/55R17'],
      ['Toyota','Camry',2022,215,55,17,'Ascent/SL — OE 215/55R17'],
      ['Toyota','Camry',2021,215,55,17,'OE 215/55R17'],
      ['Toyota','Camry',2020,215,55,17,'OE 215/55R17'],
      ['Toyota','Camry',2019,215,55,17,'OE 215/55R17'],

      // Land Cruiser 300 Series (2022-2025) — 285/60R18 all trims NZ
      ['Toyota','Land Cruiser',2025,285,60,18,'300 Series GX/VX — OE 285/60R18 Bridgestone Dueler'],
      ['Toyota','Land Cruiser',2024,285,60,18,'300 Series GX/VX'],
      ['Toyota','Land Cruiser',2023,285,60,18,'300 Series GX/VX'],
      ['Toyota','Land Cruiser',2022,285,60,18,'300 Series launch year'],
      // Land Cruiser 200 Series (to 2021)
      ['Toyota','Land Cruiser 200',2021,285,60,18,'200 Series GX/VX — final year'],
      ['Toyota','Land Cruiser 200',2020,285,60,18,'200 Series'],
      ['Toyota','Land Cruiser 200',2019,285,60,18,'200 Series'],

      // Prado 150 Series facelift (2017-2024) — NZ verified
      // GX/GXL: 265/65R17 | VX/Kakadu: 265/60R18
      ['Toyota','Land Cruiser Prado',2024,265,65,17,'150 Series GX/GXL — OE 265/65R17'],
      ['Toyota','Land Cruiser Prado',2024,265,60,18,'150 Series VX/Kakadu — OE 265/60R18'],
      ['Toyota','Land Cruiser Prado',2023,265,65,17,'GX/GXL — OE 265/65R17'],
      ['Toyota','Land Cruiser Prado',2023,265,60,18,'VX/Kakadu — OE 265/60R18'],
      ['Toyota','Land Cruiser Prado',2022,265,65,17,'GX/GXL — OE 265/65R17'],
      ['Toyota','Land Cruiser Prado',2022,265,60,18,'VX/Kakadu — OE 265/60R18'],
      ['Toyota','Land Cruiser Prado',2021,265,65,17,'GX/GXL'],
      ['Toyota','Land Cruiser Prado',2021,265,60,18,'VX/Kakadu'],
      ['Toyota','Land Cruiser Prado',2020,265,65,17,'GX/GXL'],
      ['Toyota','Land Cruiser Prado',2019,265,65,17,'GX/GXL'],

      // Fortuner AN160 (2016-2025) — 265/60R18 all NZ trims
      ['Toyota','Fortuner',2025,265,60,18,'GX/GXL — OE 265/60R18'],
      ['Toyota','Fortuner',2024,265,60,18,'GX/GXL — OE 265/60R18'],
      ['Toyota','Fortuner',2023,265,60,18,'GX/GXL'],
      ['Toyota','Fortuner',2022,265,60,18,'GX/GXL'],
      ['Toyota','Fortuner',2021,265,60,18,'GX/GXL'],
      ['Toyota','Fortuner',2020,265,60,18,'GX/GXL'],

      // C-HR (NGX10/NGX50) 2017-2023 — 215/55R18 all NZ
      ['Toyota','C-HR',2023,215,55,18,'GX/GXL — OE 215/55R18'],
      ['Toyota','C-HR',2022,215,55,18,'GX/GXL'],
      ['Toyota','C-HR',2021,215,55,18,'GX/GXL'],
      ['Toyota','C-HR',2020,215,55,18,'GX/GXL'],
      ['Toyota','C-HR',2019,215,55,18,'GX/GXL'],

      // Kluger (MXUA80) 2021-2025
      ['Toyota','Kluger',2025,235,55,19,'GX/GXL/Grande — OE 235/55R19'],
      ['Toyota','Kluger',2024,235,55,19,'GX/GXL/Grande'],
      ['Toyota','Kluger',2023,235,55,19,'GX/GXL/Grande'],
      ['Toyota','Kluger',2022,235,55,19,'GX/GXL/Grande'],
      ['Toyota','Kluger',2021,235,55,19,'New gen launch NZ'],

      // Aqua (NHP10) — popular Japanese import
      ['Toyota','Aqua',2022,175,65,15,'NHP10/NHP10G — OE 175/65R15'],
      ['Toyota','Aqua',2021,175,65,15,'NHP10G'],
      ['Toyota','Aqua',2020,175,65,15,'NHP10'],
      ['Toyota','Aqua',2019,175,65,15,'NHP10'],
      ['Toyota','Aqua',2018,175,65,15,'NHP10'],

      // Vitz/Yaris (XP130) — common import
      ['Toyota','Vitz',2019,175,65,14,'KSP130/NSP130 — OE 175/65R14 base / 185/60R15 RS'],
      ['Toyota','Vitz',2018,175,65,14,'KSP130 base'],
      ['Toyota','Vitz',2017,175,65,14,'KSP130'],

      // Noah/Voxy (ZRR80) — popular NZ import
      ['Toyota','Noah',2022,195,65,15,'ZRR80/ZRR85 — OE 195/65R15'],
      ['Toyota','Noah',2021,195,65,15,'ZRR80'],
      ['Toyota','Noah',2020,195,65,15,'ZRR80'],
      ['Toyota','Noah',2019,195,65,15,'ZRR80'],
      ['Toyota','Noah',2018,195,65,15,'ZRR80'],

      // Alphard (AGH30/AGH35) — popular NZ import
      ['Toyota','Alphard',2023,215,55,17,'AGH30/AGH35 — OE 215/55R17'],
      ['Toyota','Alphard',2022,215,55,17,'AGH30'],
      ['Toyota','Alphard',2021,215,55,17,'AGH30'],
      ['Toyota','Alphard',2020,215,55,17,'AGH30'],
      ['Toyota','Alphard',2019,215,55,17,'AGH30'],

      // Hiace (H300) 2019+
      ['Toyota','Hiace',2025,215,65,16,'H300 Commuter/LWB — OE 215/65R16'],
      ['Toyota','Hiace',2024,215,65,16,'H300 Commuter'],
      ['Toyota','Hiace',2023,215,65,16,'H300'],
      ['Toyota','Hiace',2022,215,65,16,'H300'],
      ['Toyota','Hiace',2021,215,65,16,'H300'],
      ['Toyota','Hiace',2020,215,65,16,'H300 launch'],

      // GR86 (ZN8) 2022+
      ['Toyota','GR86',2025,215,40,18,'OE front 215/40R18, rear 235/40R18 — using front size'],
      ['Toyota','GR86',2024,215,40,18,'OE staggered setup'],
      ['Toyota','GR86',2023,215,40,18,'ZN8'],

      // ═══ FORD ═══════════════════════════════════════════════════

      // Ranger gen 5 (P703) 2022-2027 — NZ verified
      // XL/XLS: 255/70R16 | XLT: 265/60R18 | Wildtrak: 255/55R20 | Raptor: 285/70R17
      ['Ford','Ranger',2025,265,60,18,'XL/XLS/XLT 4x4 — OE 265/60R18 (most common NZ spec)'],
      ['Ford','Ranger',2025,255,70,16,'XL 4x2 base — OE 255/70R16'],
      ['Ford','Ranger',2024,265,60,18,'XL/XLS/XLT 4x4 — OE 265/60R18'],
      ['Ford','Ranger',2024,255,70,16,'XL 4x2 — OE 255/70R16'],
      ['Ford','Ranger',2023,265,60,18,'XL/XLS/XLT 4x4 — OE 265/60R18'],
      ['Ford','Ranger',2023,255,70,16,'XL 4x2 — OE 255/70R16'],
      // Ranger gen 4 (P375) 2019-2022
      ['Ford','Ranger',2022,265,60,18,'XLT 4x4 — OE 265/60R18'],
      ['Ford','Ranger',2022,265,65,17,'XL/XLS 4x4 — OE 265/65R17'],
      ['Ford','Ranger',2021,265,60,18,'XLT 4x4 — OE 265/60R18'],
      ['Ford','Ranger',2021,265,65,17,'XL/XLS — OE 265/65R17'],
      ['Ford','Ranger',2020,265,60,18,'XLT — OE 265/60R18'],
      ['Ford','Ranger',2020,265,65,17,'XL/XLS — OE 265/65R17'],
      ['Ford','Ranger',2019,265,60,18,'XLT — OE 265/60R18'],
      ['Ford','Ranger',2019,265,65,17,'XL/XLS — OE 265/65R17'],
      // Ranger Wildtrak — 255/55R20 from gen 5 2022+
      ['Ford','Ranger Wildtrak',2025,255,55,20,'Wildtrak — OE 255/55R20'],
      ['Ford','Ranger Wildtrak',2024,255,55,20,'Wildtrak — OE 255/55R20'],
      ['Ford','Ranger Wildtrak',2023,255,55,20,'Wildtrak — OE 255/55R20'],
      // Pre-2023 Wildtrak used 18"
      ['Ford','Ranger Wildtrak',2022,265,60,18,'Wildtrak (old gen) — OE 265/60R18'],
      // Ranger Raptor
      ['Ford','Ranger Raptor',2025,285,70,17,'Raptor — OE BFG KO2 285/70R17'],
      ['Ford','Ranger Raptor',2024,285,70,17,'Raptor — OE BFG KO2 285/70R17'],
      ['Ford','Ranger Raptor',2023,285,70,17,'Raptor — OE BFG KO2 285/70R17'],

      // Everest (2022+)
      ['Ford','Everest',2025,265,60,18,'Ambiente/Trend — OE 265/60R18'],
      ['Ford','Everest',2024,265,60,18,'Ambiente/Trend — OE 265/60R18'],
      ['Ford','Everest',2023,265,60,18,'Ambiente/Trend'],
      ['Ford','Everest Platinum',2025,275,55,20,'Platinum/Sport — OE 275/55R20'],
      ['Ford','Everest Platinum',2024,275,55,20,'Platinum/Sport'],

      // Escape (2020+)
      ['Ford','Escape',2025,235,50,18,'ST-Line/Titanium — OE 235/50R18'],
      ['Ford','Escape',2024,235,50,18,'ST-Line/Titanium'],
      ['Ford','Escape',2023,235,50,18,'ST-Line/Titanium'],
      ['Ford','Escape',2022,235,50,18,'ST-Line/Titanium'],
      ['Ford','Escape',2021,235,50,18,'ST-Line'],

      // Mustang (S550/S650)
      ['Ford','Mustang',2024,255,40,19,'GT/EcoBoost Performance — front 255/40R19'],
      ['Ford','Mustang',2023,255,40,19,'GT — front 255/40R19'],
      ['Ford','Mustang',2022,255,40,19,'GT — front 255/40R19'],
      ['Ford','Mustang Mach-E',2024,225,55,20,'Mach-E Select/Premium — OE 225/55R20'],
      ['Ford','Mustang Mach-E',2023,225,55,20,'Mach-E'],

      // Puma (European import popular NZ)
      ['Ford','Puma',2024,215,50,18,'ST-Line/Titanium — OE 215/50R18'],
      ['Ford','Puma',2023,215,50,18,'ST-Line'],
      ['Ford','Puma',2022,215,50,18,'ST-Line'],

      // ═══ MITSUBISHI ═══════════════════════════════════════════════

      // ASX new gen (2023+) — Renault Austral based
      ['Mitsubishi','ASX',2025,215,55,18,'MR/VRX new gen — OE 215/55R18'],
      ['Mitsubishi','ASX',2024,215,55,18,'MR/VRX new gen — OE 215/55R18'],
      ['Mitsubishi','ASX',2023,215,55,18,'New gen launch NZ'],
      // ASX old gen (to 2022)
      ['Mitsubishi','ASX',2022,215,60,17,'XLS/Exceed old gen — OE 215/60R17'],
      ['Mitsubishi','ASX',2021,215,60,17,'XLS/Exceed'],
      ['Mitsubishi','ASX',2020,215,60,17,'XLS/Exceed'],
      ['Mitsubishi','ASX',2019,215,60,17,'XLS'],

      // Outlander gen 4 (2022+) NZ
      ['Mitsubishi','Outlander',2025,235,55,18,'ES/LS/LS Safety/Aspire — OE 235/55R18'],
      ['Mitsubishi','Outlander',2024,235,55,18,'ES/LS — OE 235/55R18'],
      ['Mitsubishi','Outlander',2023,235,55,18,'ES/LS — OE 235/55R18'],
      ['Mitsubishi','Outlander',2022,235,55,18,'New gen launch NZ'],
      // Outlander gen 3 (to 2021)
      ['Mitsubishi','Outlander',2021,225,55,18,'ES/LS old gen — OE 225/55R18'],
      ['Mitsubishi','Outlander',2020,225,55,18,'ES/LS old gen'],
      ['Mitsubishi','Outlander',2019,225,55,18,'ES/LS'],
      // Outlander PHEV — same size as ICE by generation
      ['Mitsubishi','Outlander PHEV',2025,235,55,18,'PHEV new gen'],
      ['Mitsubishi','Outlander PHEV',2024,235,55,18,'PHEV new gen'],
      ['Mitsubishi','Outlander PHEV',2023,235,55,18,'PHEV new gen'],
      ['Mitsubishi','Outlander PHEV',2022,235,55,18,'PHEV new gen'],
      ['Mitsubishi','Outlander PHEV',2021,225,55,18,'PHEV old gen'],
      ['Mitsubishi','Outlander PHEV',2020,225,55,18,'PHEV old gen'],

      // Eclipse Cross (2018-2025)
      ['Mitsubishi','Eclipse Cross',2025,215,55,18,'LS/VRX/PHEV — OE 215/55R18'],
      ['Mitsubishi','Eclipse Cross',2024,215,55,18,'LS/VRX — OE 215/55R18'],
      ['Mitsubishi','Eclipse Cross',2023,215,55,18,'LS/VRX'],
      ['Mitsubishi','Eclipse Cross',2022,215,55,18,'Facelifted model'],
      ['Mitsubishi','Eclipse Cross',2021,225,55,18,'Pre-facelift — OE 225/55R18'],
      ['Mitsubishi','Eclipse Cross',2020,225,55,18,'Original model'],
      ['Mitsubishi','Eclipse Cross',2019,225,55,18,'Original'],
      ['Mitsubishi','Eclipse Cross PHEV',2024,215,55,18,'PHEV — same as ICE'],
      ['Mitsubishi','Eclipse Cross PHEV',2023,215,55,18,'PHEV'],

      // Triton (2015-2025) NZ — MQ/ML series
      // XLS/GLX+: 265/60R18 | GLX base: 265/65R17
      ['Mitsubishi','Triton',2025,265,60,18,'GLX+/GLS — OE 265/60R18'],
      ['Mitsubishi','Triton',2025,265,65,17,'GLX base — OE 265/65R17'],
      ['Mitsubishi','Triton',2024,265,60,18,'GLX+/GLS — OE 265/60R18'],
      ['Mitsubishi','Triton',2024,265,65,17,'GLX base'],
      ['Mitsubishi','Triton',2023,265,60,18,'GLX+/GLS — OE 265/60R18'],
      ['Mitsubishi','Triton',2023,265,65,17,'GLX base'],
      ['Mitsubishi','Triton',2022,265,60,18,'GLX+/GLS'],
      ['Mitsubishi','Triton',2022,265,65,17,'GLX base'],
      ['Mitsubishi','Triton',2021,265,65,17,'All NZ trims (MQ gen)'],
      ['Mitsubishi','Triton',2020,265,65,17,'MQ gen'],
      ['Mitsubishi','Triton',2019,265,65,17,'MQ gen'],

      // Delica D5 (CV5W) — popular NZ import
      ['Mitsubishi','Delica D5',2023,225,70,16,'CV5W — OE 225/70R16'],
      ['Mitsubishi','Delica D5',2022,225,70,16,'CV5W'],
      ['Mitsubishi','Delica D5',2021,225,70,16,'CV5W'],
      ['Mitsubishi','Delica D5',2020,225,70,16,'CV5W'],
      ['Mitsubishi','Delica D5',2019,225,70,16,'CV5W'],
      ['Mitsubishi','Delica D5',2018,225,70,16,'CV5W'],

      // Pajero Sport (QE) 2016-2023
      ['Mitsubishi','Pajero Sport',2023,265,60,18,'GLX/GLS — OE 265/60R18'],
      ['Mitsubishi','Pajero Sport',2022,265,60,18,'GLX/GLS'],
      ['Mitsubishi','Pajero Sport',2021,265,60,18,'GLX/GLS'],
      ['Mitsubishi','Pajero Sport',2020,265,60,18,'GLX/GLS'],

      // ═══ SUZUKI ═══════════════════════════════════════════════════

      // Swift 5th gen (ZC33/ZC43) to 2024, 6th gen (AZ) 2024+
      // NZ 5th gen base: 185/60R15 | Sport: 195/50R17
      ['Suzuki','Swift',2025,185,55,16,'New 6th gen AZ — OE 185/55R16 GL'],
      ['Suzuki','Swift',2025,195,45,17,'New 6th gen Sport — OE 195/45R17'],
      ['Suzuki','Swift',2024,185,60,15,'5th gen ZC43 GL/GLX — OE 185/60R15 (last year)'],
      ['Suzuki','Swift',2023,185,60,15,'5th gen GL/GLX — OE 185/60R15'],
      ['Suzuki','Swift',2022,185,60,15,'5th gen GL/GLX'],
      ['Suzuki','Swift',2021,185,60,15,'5th gen GL/GLX'],
      ['Suzuki','Swift',2020,185,60,15,'5th gen GL/GLX'],
      ['Suzuki','Swift',2019,185,60,15,'5th gen GL/GLX'],
      ['Suzuki','Swift Sport',2024,195,50,17,'ZC33 Sport — OE 195/50R17'],
      ['Suzuki','Swift Sport',2023,195,50,17,'ZC33 Sport'],
      ['Suzuki','Swift Sport',2022,195,50,17,'ZC33 Sport'],
      ['Suzuki','Swift Sport',2021,195,50,17,'ZC33 Sport'],

      // Vitara (LY series 2015+) — 215/55R17 all trims
      ['Suzuki','Vitara',2025,215,55,17,'GL/GLX/Turbo — OE 215/55R17'],
      ['Suzuki','Vitara',2024,215,55,17,'GL/GLX/Turbo — OE 215/55R17'],
      ['Suzuki','Vitara',2023,215,55,17,'GL/GLX'],
      ['Suzuki','Vitara',2022,215,55,17,'GL/GLX'],
      ['Suzuki','Vitara',2021,215,55,17,'GL/GLX'],
      ['Suzuki','Vitara',2020,215,55,17,'GL/GLX'],
      ['Suzuki','Vitara',2019,215,55,17,'GL/GLX'],

      // Jimny Sierra (JB74) 2019+ — unique 195/80R15
      ['Suzuki','Jimny',2025,195,80,15,'Sierra — OE 195/80R15 — unique size'],
      ['Suzuki','Jimny',2024,195,80,15,'Sierra — OE 195/80R15'],
      ['Suzuki','Jimny',2023,195,80,15,'Sierra'],
      ['Suzuki','Jimny',2022,195,80,15,'Sierra'],
      ['Suzuki','Jimny',2021,195,80,15,'Sierra'],
      ['Suzuki','Jimny',2020,195,80,15,'Sierra'],
      ['Suzuki','Jimny',2019,195,80,15,'Sierra — launch year'],

      // S-Cross (2022+ YB) — 215/55R17
      ['Suzuki','S-Cross',2025,215,55,17,'GL/GLX — OE 215/55R17'],
      ['Suzuki','S-Cross',2024,215,55,17,'GL/GLX'],
      ['Suzuki','S-Cross',2023,215,55,17,'GL/GLX'],
      ['Suzuki','S-Cross',2022,215,55,17,'New gen'],

      // Baleno (2022+ GNX) — 185/65R15
      ['Suzuki','Baleno',2025,185,65,15,'GL — OE 185/65R15'],
      ['Suzuki','Baleno',2024,185,65,15,'GL'],
      ['Suzuki','Baleno',2023,185,65,15,'GL — new gen'],
      ['Suzuki','Baleno',2022,185,65,15,'GL — new gen'],

      // ═══ KIA ════════════════════════════════════════════════════

      // Seltos SP2 (2019-2025) NZ — S/Sport: 215/55R17 | GT-Line: 215/45R18
      ['Kia','Seltos',2025,215,55,17,'S/Sport/Sport+ — OE 215/55R17'],
      ['Kia','Seltos',2025,215,45,18,'GT-Line — OE 215/45R18'],
      ['Kia','Seltos',2024,215,55,17,'S/Sport — OE 215/55R17'],
      ['Kia','Seltos',2024,215,45,18,'GT-Line — OE 215/45R18'],
      ['Kia','Seltos',2023,215,55,17,'S/Sport — OE 215/55R17 (facelift)'],
      ['Kia','Seltos',2023,215,45,18,'GT-Line — OE 215/45R18'],
      ['Kia','Seltos',2022,215,55,17,'S/Sport — OE 215/55R17'],
      ['Kia','Seltos',2022,215,45,18,'GT-Line'],
      ['Kia','Seltos',2021,215,55,17,'S/Sport'],
      ['Kia','Seltos',2020,215,55,17,'S/Sport — launch NZ'],
      ['Kia','Seltos',2019,215,55,17,'Launch year'],

      // Sportage NX4 (2022-2025) NZ — S/SX: 235/55R18 | GT-Line: 255/45R19
      ['Kia','Sportage',2025,235,55,18,'S/SX — OE 235/55R18'],
      ['Kia','Sportage',2025,255,45,19,'GT-Line/Plug-in — OE 255/45R19'],
      ['Kia','Sportage',2024,235,55,18,'S/SX'],
      ['Kia','Sportage',2024,255,45,19,'GT-Line'],
      ['Kia','Sportage',2023,235,55,18,'S/SX — NX4'],
      ['Kia','Sportage',2023,255,45,19,'GT-Line — NX4'],
      ['Kia','Sportage',2022,235,55,18,'NX4 new gen NZ'],
      // Sportage QL old gen (to 2021)
      ['Kia','Sportage',2021,235,60,17,'QL gen S/SX — OE 235/60R17'],
      ['Kia','Sportage',2020,235,60,17,'QL gen'],
      ['Kia','Sportage',2019,235,60,17,'QL gen'],

      // Picanto (JA) 2017-2025
      ['Kia','Picanto',2025,175,65,14,'S — OE 175/65R14 | GT-Line: 195/45R16'],
      ['Kia','Picanto',2024,175,65,14,'S — OE 175/65R14'],
      ['Kia','Picanto',2023,175,65,14,'S — OE 175/65R14'],
      ['Kia','Picanto',2022,175,65,14,'S — OE 175/65R14'],
      ['Kia','Picanto',2021,175,65,14,'S'],
      ['Kia','Picanto',2020,175,65,14,'S'],

      // Cerato BD (2019-2023)
      ['Kia','Cerato',2023,205,55,16,'S/Sport+ — OE 205/55R16'],
      ['Kia','Cerato',2022,205,55,16,'S/Sport+'],
      ['Kia','Cerato',2021,205,55,16,'S/Sport+'],
      ['Kia','Cerato',2020,205,55,16,'S/Sport+'],
      ['Kia','Cerato',2019,205,55,16,'S/Sport+ — new gen'],

      // EV6 CV (2022-2025) — 235/55R19 or 255/45R20
      ['Kia','EV6',2025,235,55,19,'Air/GT-Line — OE 235/55R19'],
      ['Kia','EV6',2025,255,45,20,'GT-Line Performance — OE 255/45R20'],
      ['Kia','EV6',2024,235,55,19,'Air/GT-Line'],
      ['Kia','EV6',2024,255,45,20,'Performance'],
      ['Kia','EV6',2023,235,55,19,'Air/GT-Line'],
      ['Kia','EV6',2022,235,55,19,'Launch year NZ'],

      // EV9 (2024-2025) — 255/45R21
      ['Kia','EV9',2025,255,45,21,'Air/GT-Line — OE 255/45R21'],
      ['Kia','EV9',2024,255,45,21,'Air/GT-Line'],

      // Sorento MQ4 (2021-2025) — 235/65R17 or 235/55R19
      ['Kia','Sorento',2025,235,65,17,'S/SX — OE 235/65R17'],
      ['Kia','Sorento',2025,235,55,19,'SX Premium/PHEV — OE 235/55R19'],
      ['Kia','Sorento',2024,235,65,17,'S/SX'],
      ['Kia','Sorento',2024,235,55,19,'SX Premium'],
      ['Kia','Sorento',2023,235,65,17,'S/SX'],
      ['Kia','Sorento',2023,235,55,19,'SX Premium'],
      ['Kia','Sorento',2022,235,65,17,'S/SX'],
      ['Kia','Sorento',2021,235,65,17,'S/SX — new gen'],

      // Stinger CK (2018-2023)
      ['Kia','Stinger',2023,225,40,19,'GT/GT-Line — front 225/40R19, rear 255/35R19'],
      ['Kia','Stinger',2022,225,40,19,'GT — front size'],
      ['Kia','Stinger',2021,225,40,19,'GT'],
      ['Kia','Stinger',2020,225,40,19,'GT'],

      // ═══ HYUNDAI ══════════════════════════════════════════════════

      // Tucson NX4 (2021-2025) NZ — Active: 225/60R17 | Elite/N-Line/Highlander: 235/55R18 | N-Line Performance: 245/45R19
      ['Hyundai','Tucson',2025,225,60,17,'Active — OE 225/60R17'],
      ['Hyundai','Tucson',2025,235,55,18,'Elite/N-Line/Highlander — OE 235/55R18'],
      ['Hyundai','Tucson',2024,225,60,17,'Active'],
      ['Hyundai','Tucson',2024,235,55,18,'Elite/Highlander'],
      ['Hyundai','Tucson',2023,225,60,17,'Active'],
      ['Hyundai','Tucson',2023,235,55,18,'Elite/Highlander — NX4'],
      ['Hyundai','Tucson',2022,225,60,17,'Active — NX4'],
      ['Hyundai','Tucson',2022,235,55,18,'Elite/Highlander — NX4'],
      ['Hyundai','Tucson',2021,225,60,17,'Active — new gen'],
      // Tucson TL old gen (to 2021)
      ['Hyundai','Tucson',2020,225,60,17,'Active TL gen — OE 225/60R17'],
      ['Hyundai','Tucson',2019,225,60,17,'Active TL gen'],

      // i30 (PD/PDE) 2017-2025 NZ — Active: 205/60R16 | Elite/N-Line: 225/45R17 | N: 235/40R19
      ['Hyundai','i30',2025,205,60,16,'Active — OE 205/60R16'],
      ['Hyundai','i30',2025,225,45,17,'Elite/N-Line — OE 225/45R17'],
      ['Hyundai','i30',2024,205,60,16,'Active'],
      ['Hyundai','i30',2024,225,45,17,'Elite/N-Line'],
      ['Hyundai','i30',2023,205,60,16,'Active'],
      ['Hyundai','i30',2023,225,45,17,'Elite/N-Line'],
      ['Hyundai','i30',2022,205,60,16,'Active'],
      ['Hyundai','i30',2022,225,45,17,'Elite/N-Line'],
      ['Hyundai','i30',2021,205,60,16,'Active'],
      ['Hyundai','i30',2020,205,60,16,'Active'],
      ['Hyundai','i30 N',2024,235,40,19,'N Performance — OE 235/40R19 front'],
      ['Hyundai','i30 N',2023,235,40,19,'N Performance'],

      // IONIQ 5 (NE1) 2022-2025 — 235/55R19 RWD or 255/45R20 AWD
      ['Hyundai','IONIQ 5',2025,235,55,19,'Standard Range/Long Range RWD — OE 235/55R19'],
      ['Hyundai','IONIQ 5',2025,255,45,20,'Long Range AWD/N Line — OE 255/45R20'],
      ['Hyundai','IONIQ 5',2024,235,55,19,'Standard/LR RWD'],
      ['Hyundai','IONIQ 5',2024,255,45,20,'LR AWD/N'],
      ['Hyundai','IONIQ 5',2023,235,55,19,'Standard/LR RWD'],
      ['Hyundai','IONIQ 5',2023,255,45,20,'LR AWD'],
      ['Hyundai','IONIQ 5',2022,235,55,19,'NZ launch'],

      // IONIQ 6 (CE1) 2023-2025 — 245/45R18 or 245/40R20
      ['Hyundai','IONIQ 6',2025,245,45,18,'Standard — OE 245/45R18'],
      ['Hyundai','IONIQ 6',2025,245,40,20,'Long Range AWD — OE 245/40R20'],
      ['Hyundai','IONIQ 6',2024,245,45,18,'Standard'],
      ['Hyundai','IONIQ 6',2024,245,40,20,'Long Range AWD'],
      ['Hyundai','IONIQ 6',2023,245,45,18,'NZ launch'],

      // Santa Fe (MX5) 2024-2025 / (TM) to 2023
      ['Hyundai','Santa Fe',2025,235,55,19,'Active/Elite — OE 235/55R19 (MX5)'],
      ['Hyundai','Santa Fe',2024,235,55,19,'Active/Elite — OE 235/55R19 (MX5)'],
      ['Hyundai','Santa Fe',2023,235,60,17,'Active TM gen — OE 235/60R17'],
      ['Hyundai','Santa Fe',2023,235,55,19,'Elite/Highlander TM — OE 235/55R19'],
      ['Hyundai','Santa Fe',2022,235,60,17,'Active TM'],
      ['Hyundai','Santa Fe',2022,235,55,19,'Elite/Highlander'],
      ['Hyundai','Santa Fe',2021,235,60,17,'Active TM'],
      ['Hyundai','Santa Fe',2021,235,55,19,'Elite/Highlander'],
      ['Hyundai','Santa Fe',2020,235,60,17,'Active TM'],

      // Kona (OS) 2018-2023 / (SX2) 2024+
      ['Hyundai','Kona',2025,215,55,17,'Active — OE 215/55R17 (SX2)'],
      ['Hyundai','Kona',2024,215,55,17,'Active/Elite — OE 215/55R17 (SX2)'],
      ['Hyundai','Kona',2023,215,55,17,'Active/Elite OS gen'],
      ['Hyundai','Kona',2022,215,55,17,'Active OS gen'],
      ['Hyundai','Kona',2021,215,55,17,'Active OS gen'],
      ['Hyundai','Kona',2020,215,55,17,'Active OS gen'],
      ['Hyundai','Kona Electric',2024,215,55,17,'Electric SX2 — OE 215/55R17'],
      ['Hyundai','Kona Electric',2023,215,55,17,'Electric OS — OE 215/55R17'],
      ['Hyundai','Kona Electric',2022,215,55,17,'Electric OS'],

      // Staria (US4) 2021-2025
      ['Hyundai','Staria',2025,235,60,17,'Active/Elite — OE 235/60R17'],
      ['Hyundai','Staria',2024,235,60,17,'Active/Elite'],
      ['Hyundai','Staria',2023,235,60,17,'Active/Elite'],
      ['Hyundai','Staria',2022,235,60,17,'Active'],
      ['Hyundai','Staria',2021,235,60,17,'Launch'],

      // ═══ MG ══════════════════════════════════════════════════════

      // MG4 EV (2023+) — 215/55R17 Excite/Essence | 235/45R18 XPOWER
      ['MG','MG4',2025,215,55,17,'Excite/Essence — OE 215/55R17'],
      ['MG','MG4',2025,235,45,18,'XPOWER — OE 235/45R18'],
      ['MG','MG4',2024,215,55,17,'Excite/Essence'],
      ['MG','MG4',2024,235,45,18,'XPOWER'],
      ['MG','MG4',2023,215,55,17,'Excite/Essence — NZ launch'],

      // MG ZS (2017+) petrol — 215/60R16
      ['MG','ZS',2025,215,60,16,'Excite/Essence petrol — OE 215/60R16'],
      ['MG','ZS',2024,215,60,16,'Excite petrol'],
      ['MG','ZS',2023,215,60,16,'Excite petrol'],
      ['MG','ZS',2022,215,60,16,'Excite petrol'],
      // MG ZS EV — 215/55R17
      ['MG','ZS EV',2025,215,55,17,'ZS EV Excite/Essence — OE 215/55R17'],
      ['MG','ZS EV',2024,215,55,17,'ZS EV'],
      ['MG','ZS EV',2023,215,55,17,'ZS EV'],
      ['MG','ZS EV',2022,215,55,17,'ZS EV'],

      // MG HS (2019+) — 235/50R18
      ['MG','HS',2025,235,50,18,'Excite/Essence/Plus — OE 235/50R18'],
      ['MG','HS',2024,235,50,18,'Excite/Essence'],
      ['MG','HS',2023,235,50,18,'Excite/Essence'],
      ['MG','HS',2022,235,50,18,'Excite'],
      ['MG','HS',2021,235,50,18,'Excite'],

      // MG3 (2024 new gen) — 195/50R16
      ['MG','MG3',2025,195,50,16,'Excite/Essence new gen — OE 195/50R16'],
      ['MG','MG3',2024,195,50,16,'New gen — NZ launch'],

      // ═══ BYD ══════════════════════════════════════════════════════

      // Atto 3 (2022+) — 235/50R18 verified carsguide.com.au
      ['BYD','Atto 3',2025,235,50,18,'Standard/Extended/Premium — OE 235/50R18'],
      ['BYD','Atto 3',2024,235,50,18,'Standard/Extended — OE 235/50R18'],
      ['BYD','Atto 3',2023,235,50,18,'Standard/Extended'],
      ['BYD','Atto 3',2022,235,50,18,'NZ launch'],

      // Seal (2023+) — 235/45R19 RWD or 245/40R19 AWD
      ['BYD','Seal',2025,235,45,19,'RWD Standard — OE 235/45R19'],
      ['BYD','Seal',2025,245,40,19,'AWD Performance — OE 245/40R19'],
      ['BYD','Seal',2024,235,45,19,'RWD Standard'],
      ['BYD','Seal',2024,245,40,19,'AWD Performance'],
      ['BYD','Seal',2023,235,45,19,'NZ launch'],

      // Dolphin (2023+) — 195/60R16
      ['BYD','Dolphin',2025,195,60,16,'Standard/Dynamic — OE 195/60R16'],
      ['BYD','Dolphin',2024,195,60,16,'Standard/Dynamic'],
      ['BYD','Dolphin',2023,195,60,16,'NZ launch'],

      // Shark 6 PHEV ute (2025)
      ['BYD','Shark 6',2025,265,60,18,'PHEV ute — OE 265/60R18'],

      // Sealion 6 (2024+)
      ['BYD','Sealion 6',2025,235,50,18,'DM-i PHEV — OE 235/50R18'],
      ['BYD','Sealion 6',2024,235,50,18,'NZ launch'],

      // ═══ NISSAN ══════════════════════════════════════════════════

      // X-Trail T33 (2022-2025) — 225/65R17 S or 235/55R18 ST/Ti
      ['Nissan','X-Trail',2025,225,65,17,'ST base — OE 225/65R17'],
      ['Nissan','X-Trail',2025,235,55,18,'ST/Ti/Ti-L — OE 235/55R18'],
      ['Nissan','X-Trail',2024,225,65,17,'ST base'],
      ['Nissan','X-Trail',2024,235,55,18,'ST/Ti — OE 235/55R18'],
      ['Nissan','X-Trail',2023,225,65,17,'ST base — T33'],
      ['Nissan','X-Trail',2023,235,55,18,'ST/Ti — T33'],
      ['Nissan','X-Trail',2022,225,65,17,'ST — T33 new gen'],
      // X-Trail T32 (to 2022)
      ['Nissan','X-Trail',2021,225,65,17,'T32 ST/ST-L — OE 225/65R17'],
      ['Nissan','X-Trail',2020,225,65,17,'T32 ST/ST-L'],
      ['Nissan','X-Trail',2019,225,65,17,'T32 ST/ST-L'],

      // Navara D23 (2015-2025) NZ
      ['Nissan','Navara',2025,265,60,17,'RX/ST/ST-X — OE 265/60R17'],
      ['Nissan','Navara',2024,265,60,17,'RX/ST/ST-X — OE 265/60R17'],
      ['Nissan','Navara',2023,265,60,17,'RX/ST/ST-X'],
      ['Nissan','Navara',2022,265,60,17,'RX/ST/ST-X'],
      ['Nissan','Navara',2021,265,60,17,'RX/ST/ST-X'],
      ['Nissan','Navara',2020,265,60,17,'RX/ST'],
      ['Nissan','Navara',2019,265,60,17,'RX/ST'],

      // Leaf ZE1 (2018-2023) / ZE0 — 215/50R17
      ['Nissan','Leaf',2024,215,50,17,'ZE1 — OE 215/50R17'],
      ['Nissan','Leaf',2023,215,50,17,'ZE1'],
      ['Nissan','Leaf',2022,215,50,17,'ZE1'],
      ['Nissan','Leaf',2021,215,50,17,'ZE1'],
      ['Nissan','Leaf',2020,215,50,17,'ZE1'],
      ['Nissan','Leaf',2019,215,50,17,'ZE1 new gen'],

      // Qashqai J12 (2022-2025) — 225/55R18 or 235/45R20
      ['Nissan','Qashqai',2025,225,55,18,'ST/Ti — OE 225/55R18'],
      ['Nissan','Qashqai',2024,225,55,18,'ST/Ti'],
      ['Nissan','Qashqai',2023,225,55,18,'ST/Ti — J12'],
      ['Nissan','Qashqai',2022,225,55,18,'J12 NZ launch'],
      // Qashqai J11 (to 2022)
      ['Nissan','Qashqai',2021,215,60,17,'J11 ST — OE 215/60R17'],
      ['Nissan','Qashqai',2020,215,60,17,'J11 ST'],
      ['Nissan','Qashqai',2019,215,60,17,'J11 ST'],

      // Patrol Y62 (2013-2025)
      ['Nissan','Patrol',2025,285,60,18,'Ti/Ti-L — OE 285/60R18'],
      ['Nissan','Patrol',2024,285,60,18,'Ti/Ti-L'],
      ['Nissan','Patrol',2023,285,60,18,'Ti/Ti-L'],
      ['Nissan','Patrol',2022,285,60,18,'Ti/Ti-L'],
      ['Nissan','Patrol',2021,285,60,18,'Ti'],
      ['Nissan','Patrol',2020,285,60,18,'Ti'],

      // Note E13 (2021+) — 185/65R15
      ['Nissan','Note',2024,185,65,15,'e-Power — OE 185/65R15'],
      ['Nissan','Note',2023,185,65,15,'e-Power'],
      ['Nissan','Note',2022,185,65,15,'e-Power — NZ'],
      ['Nissan','Note',2021,185,65,15,'e-Power new gen'],
      // Note E12 old gen
      ['Nissan','Note',2020,185,65,15,'E12 — OE 185/65R15'],
      ['Nissan','Note',2019,185,65,15,'E12'],
      ['Nissan','Note',2018,185,65,15,'E12'],

      // ═══ MAZDA ═══════════════════════════════════════════════════

      // CX-5 KF (2017-2025) NZ — Maxx/Touring: 225/65R17 | Akera/GT: 225/55R19
      ['Mazda','CX-5',2025,225,65,17,'Maxx/Touring — OE 225/65R17'],
      ['Mazda','CX-5',2025,225,55,19,'GT/Akera — OE 225/55R19'],
      ['Mazda','CX-5',2024,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2024,225,55,19,'GT/Akera'],
      ['Mazda','CX-5',2023,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2023,225,55,19,'GT/Akera'],
      ['Mazda','CX-5',2022,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2022,225,55,19,'GT/Akera'],
      ['Mazda','CX-5',2021,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2021,225,55,19,'GT/Akera'],
      ['Mazda','CX-5',2020,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2020,225,55,19,'GT/Akera'],
      ['Mazda','CX-5',2019,225,65,17,'Maxx/Touring'],
      ['Mazda','CX-5',2019,225,55,19,'GT/Akera'],

      // CX-30 (DM) 2020-2025 — 215/55R18 all trims
      ['Mazda','CX-30',2025,215,55,18,'G20/G25/X — OE 215/55R18 (carsguide confirmed)'],
      ['Mazda','CX-30',2024,215,55,18,'G20/G25/X'],
      ['Mazda','CX-30',2023,215,55,18,'G20/G25/X'],
      ['Mazda','CX-30',2022,215,55,18,'G20/G25'],
      ['Mazda','CX-30',2021,215,55,18,'G20/G25'],
      ['Mazda','CX-30',2020,215,55,18,'Launch year NZ'],

      // CX-8 KG (2018-2025) — 225/55R19
      ['Mazda','CX-8',2025,225,55,19,'Sport/GT/Asaki — OE 225/55R19'],
      ['Mazda','CX-8',2024,225,55,19,'Sport/GT/Asaki'],
      ['Mazda','CX-8',2023,225,55,19,'Sport/GT/Asaki'],
      ['Mazda','CX-8',2022,225,55,19,'Sport/GT'],
      ['Mazda','CX-8',2021,225,55,19,'Sport/GT'],
      ['Mazda','CX-8',2020,225,55,19,'Sport/GT'],
      ['Mazda','CX-8',2019,225,55,19,'Sport/GT'],

      // CX-60 (KH) 2023-2025 — 235/50R20
      ['Mazda','CX-60',2025,235,50,20,'G40e/PHEV — OE 235/50R20'],
      ['Mazda','CX-60',2024,235,50,20,'G40e/PHEV'],
      ['Mazda','CX-60',2023,235,50,20,'NZ launch'],

      // Mazda3 (BP) 2019-2025 — 215/45R18 G20/G25 | 215/40R18 SP (same rim)
      ['Mazda','Mazda3',2025,215,45,18,'G20/G25 hatch/sedan — OE 215/45R18'],
      ['Mazda','Mazda3',2024,215,45,18,'G20/G25'],
      ['Mazda','Mazda3',2023,215,45,18,'G20/G25'],
      ['Mazda','Mazda3',2022,215,45,18,'G20/G25'],
      ['Mazda','Mazda3',2021,215,45,18,'G20/G25'],
      ['Mazda','Mazda3',2020,215,45,18,'G20/G25'],
      ['Mazda','Mazda3',2019,215,45,18,'New gen launch'],

      // Mazda6 GJ (2013-2023)
      ['Mazda','Mazda6',2023,215,45,18,'Sport/GT — OE 215/45R18'],
      ['Mazda','Mazda6',2022,215,45,18,'Sport/GT'],
      ['Mazda','Mazda6',2021,215,45,18,'Sport/GT'],
      ['Mazda','Mazda6',2020,215,45,18,'Sport/GT'],
      ['Mazda','Mazda6',2019,215,45,18,'Sport/GT'],

      // BT-50 (2021-2025) — 265/60R18 XT/GT | 265/65R17 XS base
      ['Mazda','BT-50',2025,265,60,18,'XT/GT — OE 265/60R18'],
      ['Mazda','BT-50',2025,265,65,17,'XS base — OE 265/65R17'],
      ['Mazda','BT-50',2024,265,60,18,'XT/GT'],
      ['Mazda','BT-50',2024,265,65,17,'XS base'],
      ['Mazda','BT-50',2023,265,60,18,'XT/GT'],
      ['Mazda','BT-50',2023,265,65,17,'XS base'],
      ['Mazda','BT-50',2022,265,60,18,'XT/GT'],
      ['Mazda','BT-50',2022,265,65,17,'XS'],
      ['Mazda','BT-50',2021,265,60,18,'XT/GT — new gen'],

      // ═══ SUBARU ═══════════════════════════════════════════════════

      // Outback BT (2020-2025) — 225/60R18 all trims
      ['Subaru','Outback',2025,225,60,18,'AWD 2.5i/Touring/Premium — OE 225/60R18'],
      ['Subaru','Outback',2024,225,60,18,'2.5i/Touring'],
      ['Subaru','Outback',2023,225,60,18,'2.5i/Touring'],
      ['Subaru','Outback',2022,225,60,18,'2.5i/Touring'],
      ['Subaru','Outback',2021,225,60,18,'2.5i/Touring'],
      ['Subaru','Outback',2020,225,60,18,'New gen NZ'],

      // Forester SK (2019-2025) — 225/55R18 all trims
      ['Subaru','Forester',2025,225,55,18,'2.5i/S/Sport — OE 225/55R18'],
      ['Subaru','Forester',2024,225,55,18,'2.5i/S'],
      ['Subaru','Forester',2023,225,55,18,'2.5i/S'],
      ['Subaru','Forester',2022,225,55,18,'2.5i/S'],
      ['Subaru','Forester',2021,225,55,18,'2.5i/S'],
      ['Subaru','Forester',2020,225,55,18,'2.5i/S'],
      ['Subaru','Forester',2019,225,55,18,'New gen SK launch'],

      // Crosstrek/XV GT (2018-2025) — 225/55R17 base | 225/60R17 some
      ['Subaru','XV',2025,225,55,17,'2.0i-L/Premium — OE 225/55R17'],
      ['Subaru','XV',2024,225,55,17,'2.0i-L/Premium'],
      ['Subaru','XV',2023,225,55,17,'2.0i-L'],
      ['Subaru','XV',2022,225,55,17,'2.0i-L'],
      ['Subaru','XV',2021,225,55,17,'2.0i-L'],
      ['Subaru','XV',2020,225,55,17,'2.0i-L'],
      ['Subaru','XV',2019,225,55,17,'GT gen'],

      // WRX VB (2022-2025) — 235/45R18 OE
      ['Subaru','WRX',2025,235,45,18,'2.4T — OE 235/45R18'],
      ['Subaru','WRX',2024,235,45,18,'2.4T'],
      ['Subaru','WRX',2023,235,45,18,'2.4T — VB'],
      ['Subaru','WRX',2022,235,45,18,'New gen VB launch'],

      // BRZ ZD8 (2022-2025) — 215/40R18 front / 235/40R18 rear (using front size)
      ['Subaru','BRZ',2025,215,40,18,'ZD8 — front 215/40R18, rear 235/40R18'],
      ['Subaru','BRZ',2024,215,40,18,'ZD8'],
      ['Subaru','BRZ',2023,215,40,18,'ZD8'],

      // Impreza G5 (2017-2023) — 205/55R16
      ['Subaru','Impreza',2023,205,55,16,'2.0i-L/Premium — OE 205/55R16'],
      ['Subaru','Impreza',2022,205,55,16,'2.0i-L'],
      ['Subaru','Impreza',2021,205,55,16,'2.0i-L'],
      ['Subaru','Impreza',2020,205,55,16,'2.0i-L'],
      ['Subaru','Impreza',2019,205,55,16,'2.0i-L'],

      // ═══ VOLKSWAGEN ═══════════════════════════════════════════════

      // Golf 8 (CD1) 2021-2025 — Life: 205/55R16 | R-Line/GTI: 225/40R18
      ['Volkswagen','Golf',2025,205,55,16,'Life/Style — OE 205/55R16'],
      ['Volkswagen','Golf',2025,225,40,18,'R-Line/GTI — OE 225/40R18'],
      ['Volkswagen','Golf',2024,205,55,16,'Life/Style'],
      ['Volkswagen','Golf',2024,225,40,18,'R-Line/GTI'],
      ['Volkswagen','Golf',2023,205,55,16,'Life/Style'],
      ['Volkswagen','Golf',2023,225,40,18,'R-Line/GTI'],
      ['Volkswagen','Golf',2022,205,55,16,'Life'],
      ['Volkswagen','Golf',2022,225,40,18,'GTI/R-Line'],
      ['Volkswagen','Golf',2021,205,55,16,'Life'],
      ['Volkswagen','Golf GTI',2025,225,40,18,'GTI — OE 225/40R18, optional 235/35R19'],
      ['Volkswagen','Golf GTI',2024,225,40,18,'GTI'],
      ['Volkswagen','Golf GTI',2023,225,40,18,'GTI'],
      ['Volkswagen','Golf R',2025,235,35,19,'Golf R — OE 235/35R19'],
      ['Volkswagen','Golf R',2024,235,35,19,'Golf R'],
      ['Volkswagen','Golf R',2023,235,35,19,'Golf R'],

      // Tiguan Mk2 (AD1 facelift 2021+) — Life: 215/65R17 | R-Line: 235/50R19
      ['Volkswagen','Tiguan',2025,215,65,17,'Life/Comfortline — OE 215/65R17'],
      ['Volkswagen','Tiguan',2025,235,50,19,'R-Line/Elegance — OE 235/50R19'],
      ['Volkswagen','Tiguan',2024,215,65,17,'Life'],
      ['Volkswagen','Tiguan',2024,235,50,19,'R-Line'],
      ['Volkswagen','Tiguan',2023,215,65,17,'Life'],
      ['Volkswagen','Tiguan',2023,235,50,19,'R-Line'],
      ['Volkswagen','Tiguan',2022,215,65,17,'Life'],
      ['Volkswagen','Tiguan',2022,235,50,19,'R-Line'],
      ['Volkswagen','Tiguan',2021,215,65,17,'Comfortline'],

      // T-Roc (A1 2018+) — 215/55R17 or 235/45R19
      ['Volkswagen','T-Roc',2025,215,55,17,'Life — OE 215/55R17'],
      ['Volkswagen','T-Roc',2025,235,45,19,'R-Line — OE 235/45R19'],
      ['Volkswagen','T-Roc',2024,215,55,17,'Life'],
      ['Volkswagen','T-Roc',2024,235,45,19,'R-Line'],
      ['Volkswagen','T-Roc',2023,215,55,17,'Life'],
      ['Volkswagen','T-Roc',2023,235,45,19,'R-Line'],

      // Polo AW (2018+) — 185/65R15 base | 195/55R16 higher
      ['Volkswagen','Polo',2025,185,65,15,'Life — OE 185/65R15'],
      ['Volkswagen','Polo',2025,195,55,16,'R-Line — OE 195/55R16'],
      ['Volkswagen','Polo',2024,185,65,15,'Life'],
      ['Volkswagen','Polo',2024,195,55,16,'Style/R-Line'],
      ['Volkswagen','Polo',2023,185,65,15,'Life'],
      ['Volkswagen','Polo',2023,195,55,16,'Style/R-Line'],

      // Amarok NF (2023+) and Mk1
      ['Volkswagen','Amarok',2025,255,60,18,'TDI450/TDI600 — OE 255/60R18'],
      ['Volkswagen','Amarok',2024,255,60,18,'TDI450/TDI600'],
      ['Volkswagen','Amarok',2023,255,60,18,'New gen NF NZ'],
      ['Volkswagen','Amarok',2022,255,60,18,'Mk1 — OE 255/60R18'],
      ['Volkswagen','Amarok',2021,255,60,18,'Mk1'],
      ['Volkswagen','Amarok',2020,255,60,18,'Mk1'],

      // ═══ BMW ══════════════════════════════════════════════════════

      // 3 Series G20 (2019-2025) — 225/50R17 or 225/45R18
      ['BMW','3 Series',2025,225,50,17,'320i base — OE 225/50R17'],
      ['BMW','3 Series',2025,225,45,18,'330i/M Sport — OE 225/45R18'],
      ['BMW','3 Series',2024,225,50,17,'320i base'],
      ['BMW','3 Series',2024,225,45,18,'330i/M340i/M Sport'],
      ['BMW','3 Series',2023,225,50,17,'320i base'],
      ['BMW','3 Series',2023,225,45,18,'330i/M340i'],
      ['BMW','3 Series',2022,225,45,18,'330i/M340i'],
      ['BMW','3 Series',2021,225,45,18,'330i/M340i'],
      ['BMW','3 Series',2020,225,45,18,'330i'],
      ['BMW','3 Series',2019,225,45,18,'New gen G20'],

      // 5 Series G30/G60 (2017-2025)
      ['BMW','5 Series',2025,245,45,18,'530i/520d — OE 245/45R18'],
      ['BMW','5 Series',2024,245,45,18,'530i/520d'],
      ['BMW','5 Series',2023,245,45,18,'530i/M550i G30'],
      ['BMW','5 Series',2022,245,45,18,'530i G30'],
      ['BMW','5 Series',2021,245,45,18,'530i G30'],
      ['BMW','5 Series',2020,245,45,18,'530i G30'],

      // X3 G01 (2018-2025)
      ['BMW','X3',2025,245,50,19,'xDrive20i/30i — OE 245/50R19'],
      ['BMW','X3',2024,245,50,19,'xDrive20i/30i'],
      ['BMW','X3',2023,245,50,19,'xDrive20i'],
      ['BMW','X3',2022,245,50,19,'xDrive20i'],
      ['BMW','X3',2021,245,50,19,'xDrive20i'],

      // X5 G05 (2019-2025)
      ['BMW','X5',2025,255,50,19,'xDrive30d/50e — OE 255/50R19'],
      ['BMW','X5',2024,255,50,19,'xDrive30d/50e'],
      ['BMW','X5',2023,255,50,19,'xDrive30d'],
      ['BMW','X5',2022,255,50,19,'xDrive30d'],
      ['BMW','X5',2021,255,50,19,'xDrive30d'],

      // X1 U11 (2023-2025) / F48 to 2022
      ['BMW','X1',2025,225,50,18,'sDrive18i/xDrive23i — OE 225/50R18'],
      ['BMW','X1',2024,225,50,18,'sDrive18i — U11'],
      ['BMW','X1',2023,225,50,18,'U11 new gen'],
      ['BMW','X1',2022,225,50,18,'F48 — OE 225/50R18'],
      ['BMW','X1',2021,225,50,18,'F48'],

      // ═══ MERCEDES-BENZ ════════════════════════════════════════════

      // C-Class W206 (2022-2025) — 225/50R18
      ['Mercedes-Benz','C-Class',2025,225,50,18,'C200/C300 — OE 225/50R18 (W206)'],
      ['Mercedes-Benz','C-Class',2024,225,50,18,'C200/C300 — W206'],
      ['Mercedes-Benz','C-Class',2023,225,50,18,'C200 — W206'],
      ['Mercedes-Benz','C-Class',2022,225,50,18,'W206 new gen'],
      // W205 to 2021
      ['Mercedes-Benz','C-Class',2021,225,45,17,'C200/C300 W205 — OE 225/45R17'],
      ['Mercedes-Benz','C-Class',2020,225,45,17,'W205'],
      ['Mercedes-Benz','C-Class',2019,225,45,17,'W205'],

      // GLC X254 (2023+) / X253 to 2022
      ['Mercedes-Benz','GLC',2025,235,55,19,'GLC200/GLC300 — OE 235/55R19 (X254)'],
      ['Mercedes-Benz','GLC',2024,235,55,19,'GLC200/300 — X254'],
      ['Mercedes-Benz','GLC',2023,235,55,19,'X254 new gen'],
      ['Mercedes-Benz','GLC',2022,235,60,18,'X253 — OE 235/60R18'],
      ['Mercedes-Benz','GLC',2021,235,60,18,'X253'],
      ['Mercedes-Benz','GLC',2020,235,60,18,'X253'],

      // A-Class W177 (2019-2025) — 205/60R16 base | 225/45R17 AMG-Line
      ['Mercedes-Benz','A-Class',2025,205,60,16,'A180/A200 — OE 205/60R16'],
      ['Mercedes-Benz','A-Class',2025,225,45,17,'AMG-Line — OE 225/45R17'],
      ['Mercedes-Benz','A-Class',2024,205,60,16,'A180/A200'],
      ['Mercedes-Benz','A-Class',2024,225,45,17,'AMG-Line'],
      ['Mercedes-Benz','A-Class',2023,205,60,16,'A180/A200'],
      ['Mercedes-Benz','A-Class',2022,205,60,16,'A180/A200'],
      ['Mercedes-Benz','A-Class',2021,205,60,16,'A180/A200'],
      ['Mercedes-Benz','A-Class',2020,205,60,16,'A180/A200'],

      // GLA H247 (2020+) — 235/50R18
      ['Mercedes-Benz','GLA',2025,235,50,18,'GLA180/200 — OE 235/50R18'],
      ['Mercedes-Benz','GLA',2024,235,50,18,'GLA180/200'],
      ['Mercedes-Benz','GLA',2023,235,50,18,'GLA180/200'],
      ['Mercedes-Benz','GLA',2022,235,50,18,'GLA200'],
      ['Mercedes-Benz','GLA',2021,235,50,18,'GLA200'],
      ['Mercedes-Benz','GLA',2020,235,50,18,'Launch year'],

      // ═══ AUDI ════════════════════════════════════════════════════

      // A4 B9 (2016-2025)
      ['Audi','A4',2025,225,50,17,'40 TFSI/35 TDI — OE 225/50R17'],
      ['Audi','A4',2024,225,50,17,'40 TFSI'],
      ['Audi','A4',2023,225,50,17,'40 TFSI'],
      ['Audi','A4',2022,225,50,17,'40 TFSI'],
      ['Audi','A4',2021,225,50,17,'40 TFSI'],
      ['Audi','A4',2020,225,50,17,'40 TFSI'],
      ['Audi','A4',2019,225,50,17,'40 TFSI — B9'],

      // Q5 FY (2017-2025) — 235/60R18 or 235/55R19
      ['Audi','Q5',2025,235,60,18,'45 TFSI — OE 235/60R18'],
      ['Audi','Q5',2025,235,55,19,'Sport/S-Line — OE 235/55R19'],
      ['Audi','Q5',2024,235,60,18,'45 TFSI'],
      ['Audi','Q5',2024,235,55,19,'S-Line'],
      ['Audi','Q5',2023,235,60,18,'45 TFSI'],
      ['Audi','Q5',2023,235,55,19,'S-Line'],
      ['Audi','Q5',2022,235,60,18,'45 TFSI'],
      ['Audi','Q5',2021,235,60,18,'45 TFSI'],

      // Q3 F3 (2019-2025) — 215/60R17 or 215/55R18
      ['Audi','Q3',2025,215,60,17,'35 TFSI base — OE 215/60R17'],
      ['Audi','Q3',2025,215,55,18,'35/40 TFSI Sport — OE 215/55R18'],
      ['Audi','Q3',2024,215,60,17,'35 TFSI base'],
      ['Audi','Q3',2024,215,55,18,'Sport/S-Line'],
      ['Audi','Q3',2023,215,60,17,'35 TFSI'],
      ['Audi','Q3',2023,215,55,18,'Sport/S-Line'],
      ['Audi','Q3',2022,215,60,17,'35 TFSI'],
      ['Audi','Q3',2021,215,60,17,'35 TFSI'],

      // A3 8Y (2021-2025) — 225/45R17 or 225/40R18
      ['Audi','A3',2025,225,45,17,'35 TFSI — OE 225/45R17'],
      ['Audi','A3',2025,225,40,18,'S-Line/40 TFSI — OE 225/40R18'],
      ['Audi','A3',2024,225,45,17,'35 TFSI'],
      ['Audi','A3',2024,225,40,18,'S-Line'],
      ['Audi','A3',2023,225,45,17,'35 TFSI'],
      ['Audi','A3',2023,225,40,18,'S-Line'],
      ['Audi','A3',2022,225,45,17,'35 TFSI'],
      ['Audi','A3',2021,225,45,17,'35 TFSI — new gen 8Y'],

      // ═══ HONDA ═══════════════════════════════════════════════════

      // CR-V RS6 (2023-2025) — 235/50R19 | older gen 235/60R18
      ['Honda','CR-V',2025,235,50,19,'VTi/VTi-LX e:HEV — OE 235/50R19'],
      ['Honda','CR-V',2024,235,50,19,'VTi/VTi-LX'],
      ['Honda','CR-V',2023,235,50,19,'RS6 new gen'],
      ['Honda','CR-V',2022,235,60,18,'RW gen — OE 235/60R18'],
      ['Honda','CR-V',2021,235,60,18,'RW gen'],
      ['Honda','CR-V',2020,235,60,18,'RW gen'],
      ['Honda','CR-V',2019,235,60,18,'RW gen'],

      // Jazz GR (2021-2025) — 185/60R15
      ['Honda','Jazz',2025,185,60,15,'VTi/VTi-S e:HEV — OE 185/60R15'],
      ['Honda','Jazz',2024,185,60,15,'VTi/VTi-S'],
      ['Honda','Jazz',2023,185,60,15,'VTi/VTi-S'],
      ['Honda','Jazz',2022,185,60,15,'VTi — GR gen'],
      ['Honda','Jazz',2021,185,60,15,'NZ launch GR gen'],

      // Civic FE (2022-2025) — 235/40R18
      ['Honda','Civic',2025,235,40,18,'VTi-LX/RS — OE 235/40R18'],
      ['Honda','Civic',2024,235,40,18,'VTi-LX/RS'],
      ['Honda','Civic',2023,235,40,18,'VTi-LX/RS — FE'],
      ['Honda','Civic',2022,235,40,18,'New gen FE NZ'],
      // Civic FC old gen (to 2021)
      ['Honda','Civic',2021,215,55,16,'VTi/VTi-S FC — OE 215/55R16'],
      ['Honda','Civic',2020,215,55,16,'VTi FC'],
      ['Honda','Civic',2019,215,55,16,'VTi FC'],

      // HR-V RU3 (2022-2025) — 215/55R17
      ['Honda','HR-V',2025,215,55,17,'VTi/VTi-X e:HEV — OE 215/55R17'],
      ['Honda','HR-V',2024,215,55,17,'VTi/VTi-X'],
      ['Honda','HR-V',2023,215,55,17,'VTi/VTi-X — new gen'],
      ['Honda','HR-V',2022,215,55,17,'RU3 NZ launch'],
      // HR-V RU old gen (to 2021)
      ['Honda','HR-V',2021,215,55,16,'VTi/VTi-S RU — OE 215/55R16'],
      ['Honda','HR-V',2020,215,55,16,'VTi RU'],
      ['Honda','HR-V',2019,215,55,16,'VTi RU'],

      // ZR-V RS6 (2023-2025) — 235/50R18
      ['Honda','ZR-V',2025,235,50,18,'e:HEV L/X — OE 235/50R18'],
      ['Honda','ZR-V',2024,235,50,18,'e:HEV L/X'],
      ['Honda','ZR-V',2023,235,50,18,'NZ launch'],

      // Odyssey RC (import) — 215/55R17
      ['Honda','Odyssey',2022,215,55,17,'RC1/RC2 import — OE 215/55R17'],
      ['Honda','Odyssey',2021,215,55,17,'RC1/RC2'],
      ['Honda','Odyssey',2020,215,55,17,'RC1/RC2'],
      ['Honda','Odyssey',2019,215,55,17,'RC1/RC2'],

      // Freed GB5 (import)
      ['Honda','Freed',2022,185,55,15,'GB5/GB6 import — OE 185/55R15'],
      ['Honda','Freed',2021,185,55,15,'GB5'],
      ['Honda','Freed',2020,185,55,15,'GB5'],
      ['Honda','Freed',2019,185,55,15,'GB5'],

      // Fit GK (import to 2021) — 175/65R14 or 185/55R15
      ['Honda','Fit',2021,185,55,15,'GK3/GK5 import — 15" alloy'],
      ['Honda','Fit',2020,185,55,15,'GK3/GK5'],
      ['Honda','Fit',2019,175,65,14,'GK3 base — 14"'],
      ['Honda','Fit',2018,175,65,14,'GK3'],
      ['Honda','Fit',2017,175,65,14,'GK3'],

      // ═══ ISUZU ═══════════════════════════════════════════════════

      // D-Max Tz50 (2021-2025) — XS base: 265/65R17 | LS/LS-U/X-Terrain: 265/60R18
      ['Isuzu','D-Max',2025,265,65,17,'XS base — OE 265/65R17'],
      ['Isuzu','D-Max',2025,265,60,18,'LS/LS-U/X-Terrain — OE 265/60R18'],
      ['Isuzu','D-Max',2024,265,65,17,'XS base'],
      ['Isuzu','D-Max',2024,265,60,18,'LS/LS-U/X-Terrain'],
      ['Isuzu','D-Max',2023,265,65,17,'XS base'],
      ['Isuzu','D-Max',2023,265,60,18,'LS/LS-U/X-Terrain'],
      ['Isuzu','D-Max',2022,265,65,17,'XS base'],
      ['Isuzu','D-Max',2022,265,60,18,'LS/LS-U'],
      ['Isuzu','D-Max',2021,265,65,17,'XS — new gen Tz50'],
      // D-Max Tz50 old gen (to 2020)
      ['Isuzu','D-Max',2020,265,65,17,'LS/LST old gen'],
      ['Isuzu','D-Max',2019,265,65,17,'LS old gen'],

      // MU-X RJ85 (2021-2025) — 265/60R18 all
      ['Isuzu','MU-X',2025,265,60,18,'LS/LS-U/LS-T — OE 265/60R18'],
      ['Isuzu','MU-X',2024,265,60,18,'LS/LS-U'],
      ['Isuzu','MU-X',2023,265,60,18,'LS/LS-U — new gen'],
      ['Isuzu','MU-X',2022,265,60,18,'LS/LS-U'],
      ['Isuzu','MU-X',2021,265,60,18,'New gen'],

      // ═══ GWM / HAVAL ══════════════════════════════════════════════

      // GWM Ute (2022-2025) — 255/65R17 Cannon/Ultra
      ['GWM','Ute',2025,255,65,17,'Cannon/Cannon-X/Ultra — OE 255/65R17'],
      ['GWM','Ute',2024,255,65,17,'Cannon/Ultra'],
      ['GWM','Ute',2023,255,65,17,'Cannon/Ultra'],
      ['GWM','Ute',2022,255,65,17,'Launch NZ'],

      // Haval H6 (2021-2025) — 235/55R19 Ultra/GT
      ['GWM','Haval H6',2025,235,55,19,'Ultra/GT — OE 235/55R19'],
      ['GWM','Haval H6',2024,235,55,19,'Ultra/GT'],
      ['GWM','Haval H6',2023,235,55,19,'Ultra/GT'],
      ['GWM','Haval H6',2022,235,55,19,'NZ launch'],

      // Haval Jolion (2021-2025) — 215/55R18 Premium/Ultra
      ['GWM','Haval Jolion',2025,215,55,18,'Premium/Ultra — OE 215/55R18'],
      ['GWM','Haval Jolion',2024,215,55,18,'Premium/Ultra'],
      ['GWM','Haval Jolion',2023,215,55,18,'Premium/Ultra'],
      ['GWM','Haval Jolion',2022,215,55,18,'NZ launch'],
      ['GWM','Haval Jolion',2021,215,55,18,'Launch'],

      // Tank 300 (2023-2025) — 265/60R18
      ['GWM','Tank 300',2025,265,60,18,'Hi4 — OE 265/60R18'],
      ['GWM','Tank 300',2024,265,60,18,'Hi4'],
      ['GWM','Tank 300',2023,265,60,18,'NZ launch'],

      // ═══ TESLA ═══════════════════════════════════════════════════

      // Model 3 (2023+ Highland) — RWD: 235/40R18 | AWD/Performance: 235/35R20 or 245/35R20
      ['Tesla','Model 3',2025,235,40,18,'RWD Standard/Long Range — OE 235/40R18 (Highland)'],
      ['Tesla','Model 3',2025,235,35,20,'Performance — OE 235/35R20 front / 245/35R20 rear'],
      ['Tesla','Model 3',2024,235,40,18,'RWD — OE 235/40R18 (Highland Michelin Pilot Sport EV)'],
      ['Tesla','Model 3',2024,235,35,20,'Performance'],
      ['Tesla','Model 3',2023,235,40,18,'Highland new gen NZ'],
      // Pre-Highland (to 2023)
      ['Tesla','Model 3',2022,235,40,18,'RWD/LR — OE 235/40R18 Michelin PS4'],
      ['Tesla','Model 3',2022,235,35,20,'Performance — 20" Überturbine'],
      ['Tesla','Model 3',2021,235,40,18,'RWD/LR'],
      ['Tesla','Model 3',2021,235,35,20,'Performance'],
      ['Tesla','Model 3',2020,235,40,18,'Standard/LR RWD'],

      // Model Y (2022-2025) — RWD: 255/45R19 | Performance: 255/40R20 rear / 255/45R19 front
      ['Tesla','Model Y',2025,255,45,19,'RWD/Long Range — OE 255/45R19 (Gemini wheels)'],
      ['Tesla','Model Y',2025,255,40,20,'Performance — OE 255/40R20 Uberturbine'],
      ['Tesla','Model Y',2024,255,45,19,'RWD/LR — OE 255/45R19'],
      ['Tesla','Model Y',2024,255,40,20,'Performance'],
      ['Tesla','Model Y',2023,255,45,19,'RWD/LR'],
      ['Tesla','Model Y',2023,255,40,20,'Performance'],
      ['Tesla','Model Y',2022,255,45,19,'NZ launch'],

      // Model S (2021+) — 245/45R21
      ['Tesla','Model S',2025,245,45,21,'Long Range/Plaid — OE 245/45R21'],
      ['Tesla','Model S',2024,245,45,21,'LR/Plaid'],
      ['Tesla','Model S',2023,245,45,21,'LR/Plaid'],

      // Model X (2021+) — 265/45R20
      ['Tesla','Model X',2025,265,45,20,'Long Range/Plaid — OE 265/45R20'],
      ['Tesla','Model X',2024,265,45,20,'LR/Plaid'],
      ['Tesla','Model X',2023,265,45,20,'LR/Plaid'],

      // ═══ PORSCHE ═════════════════════════════════════════════════

      // 911 (992) 2020-2025 — staggered, using front size
      ['Porsche','911',2025,245,40,20,'992 Carrera S/4S front — OE 245/40R20'],
      ['Porsche','911',2024,245,40,20,'992 Carrera'],
      ['Porsche','911',2023,245,40,20,'992 Carrera'],
      ['Porsche','911',2022,245,40,20,'992 Carrera'],
      ['Porsche','911',2021,245,40,20,'992 Carrera'],

      // Cayenne (PO536 2018-2025) — 265/50R19 or 275/45R21
      ['Porsche','Cayenne',2025,265,50,19,'Base/S — OE 265/50R19'],
      ['Porsche','Cayenne',2024,265,50,19,'Base/S'],
      ['Porsche','Cayenne',2023,265,50,19,'Base/S'],
      ['Porsche','Cayenne',2022,265,50,19,'Base/S'],

      // Macan (95B 2014-2024, J1 EV 2024+) — 235/55R19 or 265/45R21
      ['Porsche','Macan',2025,235,55,19,'EV — OE 235/55R19 base'],
      ['Porsche','Macan',2024,235,55,19,'Macan EV launch / ICE final year'],
      ['Porsche','Macan',2023,235,55,19,'95B ICE — OE 235/55R19'],
      ['Porsche','Macan',2022,235,55,19,'95B ICE'],
      ['Porsche','Macan',2021,235,55,19,'95B ICE'],

      // ═══ LAND ROVER ══════════════════════════════════════════════

      // Defender (L663) 2020-2025
      ['Land Rover','Defender',2025,255,55,20,'90/110 SE — OE 255/55R20'],
      ['Land Rover','Defender',2024,255,55,20,'90/110 SE/HSE'],
      ['Land Rover','Defender',2023,255,55,20,'90/110 SE/HSE'],
      ['Land Rover','Defender',2022,255,55,20,'90/110'],
      ['Land Rover','Defender',2021,255,55,20,'90/110'],

      // Discovery Sport (L550 2015-2025) — 235/55R19 or 235/60R18
      ['Land Rover','Discovery Sport',2025,235,55,19,'S/SE — OE 235/55R19'],
      ['Land Rover','Discovery Sport',2024,235,55,19,'S/SE'],
      ['Land Rover','Discovery Sport',2023,235,55,19,'S/SE'],
      ['Land Rover','Discovery Sport',2022,235,60,18,'S — OE 235/60R18'],

      // Range Rover Evoque (L551 2019+) — 235/50R20 or 235/55R19
      ['Land Rover','Range Rover Evoque',2025,235,50,20,'R-Dynamic SE/HSE — OE 235/50R20'],
      ['Land Rover','Range Rover Evoque',2024,235,50,20,'R-Dynamic SE/HSE'],
      ['Land Rover','Range Rover Evoque',2023,235,50,20,'R-Dynamic'],
      ['Land Rover','Range Rover Evoque',2022,235,55,19,'SE — OE 235/55R19'],

      // ═══ JEEP ════════════════════════════════════════════════════

      // Wrangler JL (2018-2025) — 255/75R17 Sahara or 255/70R18 Rubicon
      ['Jeep','Wrangler',2025,255,75,17,'Sahara/Sport — OE 255/75R17'],
      ['Jeep','Wrangler',2024,255,75,17,'Sahara/Sport'],
      ['Jeep','Wrangler',2023,255,75,17,'Sahara/Sport'],
      ['Jeep','Wrangler',2022,255,75,17,'Sahara/Sport'],
      ['Jeep','Wrangler',2021,255,75,17,'Sahara/Sport'],
      ['Jeep','Wrangler',2020,255,75,17,'Sahara/Sport'],

      // Compass MP (2017-2025) — 215/60R17 or 215/55R18
      ['Jeep','Compass',2025,215,60,17,'Active/Longitude — OE 215/60R17'],
      ['Jeep','Compass',2025,215,55,18,'Limited/S-Limited — OE 215/55R18'],
      ['Jeep','Compass',2024,215,60,17,'Active/Longitude'],
      ['Jeep','Compass',2024,215,55,18,'Limited'],
      ['Jeep','Compass',2023,215,60,17,'Active'],
      ['Jeep','Compass',2023,215,55,18,'Limited'],

      // ═══ POPULAR JAPANESE IMPORTS ════════════════════════════════

      // Mazda Demio/Mazda2 DJ (import) — 185/65R15
      ['Mazda','Demio',2020,185,65,15,'DJ3FS/DJ5FS — OE 185/65R15'],
      ['Mazda','Demio',2019,185,65,15,'DJ3FS'],
      ['Mazda','Demio',2018,185,65,15,'DJ3FS'],
      ['Mazda','Demio',2017,185,65,15,'DJ3FS'],

      // Mazda Atenza/Mazda6 GJ (import)
      ['Mazda','Atenza',2019,225,45,19,'GJ2FP/GJEFP — OE 225/45R19'],
      ['Mazda','Atenza',2018,225,45,19,'GJ2FP'],

      // Mazda Axela/Mazda3 BM (import)
      ['Mazda','Axela',2019,205,60,16,'BM2AP/BMEFP — OE 205/60R16'],
      ['Mazda','Axela',2018,205,60,16,'BM2AP'],
      ['Mazda','Axela',2017,205,60,16,'BM2AP'],

      // Subaru Legacy BN/BS (2014-2019)
      ['Subaru','Legacy',2019,215,55,16,'BN9/BS9 2.5i — OE 215/55R16'],
      ['Subaru','Legacy',2018,215,55,16,'BN9'],
      ['Subaru','Legacy',2017,215,55,16,'BN9'],

      // Nissan Tiida C11 (import)
      ['Nissan','Tiida',2019,195,55,16,'C11 — OE 195/55R16'],
      ['Nissan','Tiida',2018,195,55,16,'C11'],
      ['Nissan','Tiida',2017,195,55,16,'C11'],
    ];
    db.transaction(rows => rows.forEach(r => ins.run(...r)))(vehicles);
    console.log('✅  Seeded', vehicles.length, 'vehicles');
  }

  console.log('✅  DB ready:', DB_PATH);
  return db;
}
module.exports = { getDb, initDb };
