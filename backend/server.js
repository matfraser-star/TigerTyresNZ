'use strict';
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const { initDb, getDb } = require('./db');

const PORT        = process.env.PORT || 3001;
const JWT_SECRET  = process.env.JWT_SECRET || 'tigertyres-change-me';
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname,'..','frontend','public','uploads');
const FRONTEND_DIST = path.join(__dirname,'..','frontend','dist');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR,{recursive:true});
const db = initDb();

// ── Helpers ──────────────────────────────────────────────────────────
function setting(key) {
  const r = getDb().prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? r.value : '';
}

async function getTransport() {
  const host = setting('smtp_host');
  if (!host) return null;
  return nodemailer.createTransport({
    host, port: Number(setting('smtp_port')) || 587,
    secure: Number(setting('smtp_port')) === 465,
    auth: { user: setting('smtp_user'), pass: setting('smtp_pass') }
  });
}

async function sendMail(to, subject, html) {
  try {
    const t = await getTransport();
    if (!t) return;
    const from = `"${setting('shop_name')}" <${setting('smtp_user')}>`;
    await t.sendMail({ from, to, subject, html });
    console.log('📧 Mail sent to', to);
  } catch(e) { console.error('Mail error:', e.message); }
}

async function notifyAdmin(subject, html) {
  const notify = setting('notify_email');
  if (notify) await sendMail(notify, subject, html);
}

// Generate booking slots based on settings, respecting buffer
function generateSlots(date) {
  const openDays   = setting('booking_open_days') || '1111110'; // 7 chars Mon-Sun
  const openTime   = setting('booking_open_time')  || '08:00';
  const closeTime  = setting('booking_close_time') || '17:00';
  const slotMins   = Number(setting('booking_slot_minutes')) || 60;
  const bufferMins = Number(setting('booking_buffer_minutes')) || 0;

  // Day of week check (0=Mon)
  const d = new Date(date + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7; // JS Sunday=0, convert Mon=0
  if (openDays[dow] !== '1') return [];

  // Check blocked dates
  const blocked = getDb().prepare('SELECT id FROM blocked_dates WHERE date=?').get(date);
  if (blocked) return [];

  // Generate slots
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const startMins = oh * 60 + om;
  const endMins   = ch * 60 + cm;
  const slots = [];
  for (let m = startMins; m + slotMins <= endMins; m += slotMins + bufferMins) {
    const h = String(Math.floor(m/60)).padStart(2,'0');
    const min = String(m%60).padStart(2,'0');
    slots.push(`${h}:${min}`);
  }

  // Mark booked slots
  const bookedTimes = getDb()
    .prepare("SELECT time FROM bookings WHERE date=? AND status!='cancelled'")
    .all(date).map(r => r.time);

  return slots.map(t => ({ time: t, available: !bookedTimes.includes(t) }));
}

// ── Multer ────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb) => cb(null, UPLOADS_DIR),
    filename:    (_,f,cb)  => cb(null, `tyre_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(f.originalname)||'.jpg'}`),
  }),
  limits: { fileSize: 8*1024*1024 },
  fileFilter: (_,f,cb) => cb(null, /^image\//.test(f.mimetype)),
});

// ── App ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.use('/uploads', express.static(UPLOADS_DIR));
if (fs.existsSync(FRONTEND_DIST)) app.use(express.static(FRONTEND_DIST));

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error:'Unauthorised' });
  try { req.admin = jwt.verify(auth.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error:'Invalid token' }); }
}

// ════════════════════ AUTH ════════════════════════════════════════════
app.post('/api/auth/login', (req,res) => {
  const { username, password } = req.body;
  const admin = getDb().prepare('SELECT * FROM admins WHERE username=?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash))
    return res.status(401).json({ error:'Invalid credentials' });
  res.json({ token: jwt.sign({ id:admin.id, username:admin.username }, JWT_SECRET, { expiresIn:'12h' }), username: admin.username });
});

app.post('/api/auth/change-password', requireAuth, (req,res) => {
  const admin = getDb().prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
  if (!bcrypt.compareSync(req.body.currentPassword, admin.password_hash))
    return res.status(401).json({ error:'Wrong password' });
  getDb().prepare('UPDATE admins SET password_hash=? WHERE id=?').run(bcrypt.hashSync(req.body.newPassword,10), req.admin.id);
  res.json({ ok:true });
});

// ════════════════════ TYRES (public) ══════════════════════════════════
app.get('/api/tyres', (req,res) => {
  const { search, rim, width, profile, condition, sort, inStock, featured } = req.query;
  let sql = 'SELECT * FROM tyres WHERE 1=1';
  const p = [];
  if (search)    { sql+=' AND (brand LIKE ? OR model LIKE ?)'; p.push(`%${search}%`,`%${search}%`); }
  if (width)     { sql+=' AND width=?';     p.push(+width); }
  if (profile)   { sql+=' AND profile=?';   p.push(+profile); }
  if (rim)       { sql+=' AND rim=?';       p.push(+rim); }
  if (condition) { sql+=' AND condition=?'; p.push(condition); }
  if (inStock === 'true') sql+=' AND qty>0';
  if (featured === 'true') sql+=' AND featured=1';
  const sorts = { price_asc:'price ASC', price_desc:'price DESC', rim_desc:'rim DESC', brand:'brand ASC,model ASC', newest:'created_at DESC' };
  sql += ` ORDER BY ${sorts[sort]||'price ASC'}`;
  res.json(getDb().prepare(sql).all(...p));
});

app.get('/api/tyres/meta/rims',    (_,res) => res.json(getDb().prepare('SELECT DISTINCT rim     FROM tyres ORDER BY rim DESC').all().map(r=>r.rim)));
app.get('/api/tyres/meta/widths',  (_,res) => res.json(getDb().prepare('SELECT DISTINCT width   FROM tyres ORDER BY width ASC').all().map(r=>r.width)));
app.get('/api/tyres/meta/profiles',(_,res) => res.json(getDb().prepare('SELECT DISTINCT profile FROM tyres ORDER BY profile ASC').all().map(r=>r.profile)));

app.get('/api/tyres/:id', (req,res) => {
  const t = getDb().prepare('SELECT * FROM tyres WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error:'Not found' });
  const reviews = getDb().prepare('SELECT * FROM reviews WHERE tyre_id=? AND approved=1 ORDER BY created_at DESC').all(req.params.id);
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : null;
  res.json({ ...t, reviews, avg_rating:avg, review_count:reviews.length });
});

// ════════════════════ REVIEWS (public) ════════════════════════════════
app.post('/api/tyres/:id/reviews', (req,res) => {
  const { author, rating, body } = req.body;
  if (!author||!rating) return res.status(400).json({ error:'Missing fields' });
  const info = getDb().prepare('INSERT INTO reviews (tyre_id,author,rating,body) VALUES (?,?,?,?)').run(req.params.id,author,+rating,body||'');
  res.status(201).json({ id:info.lastInsertRowid, ok:true });
});

// ════════════════════ VEHICLE LOOKUP ══════════════════════════════════
app.get('/api/vehicles/makes',   (_,res)  => res.json(getDb().prepare('SELECT DISTINCT make FROM vehicles ORDER BY make').all().map(r=>r.make)));
app.get('/api/vehicles/models',  (req,res) => res.json(getDb().prepare('SELECT DISTINCT model FROM vehicles WHERE make=? ORDER BY model').all(req.query.make).map(r=>r.model)));
app.get('/api/vehicles/years',   (req,res) => res.json(getDb().prepare('SELECT DISTINCT year FROM vehicles WHERE make=? AND model=? ORDER BY year DESC').all(req.query.make,req.query.model).map(r=>r.year)));
app.get('/api/vehicles/fitment', (req,res) => {
  const { make, model, year } = req.query;
  const v = getDb().prepare('SELECT * FROM vehicles WHERE make=? AND model=? AND year=?').get(make, model, +year);
  if (!v) return res.status(404).json({ error:'No fitment data found' });
  const tyres = getDb().prepare('SELECT * FROM tyres WHERE width=? AND profile=? AND rim=? AND qty>0 ORDER BY price ASC').all(v.width,v.profile,v.rim);
  res.json({ fitment:v, tyres });
});

// ════════════════════ BOOKINGS (public) ═══════════════════════════════
app.get('/api/bookings/availability', (req,res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error:'date required' });
  res.json(generateSlots(date));
});

app.post('/api/bookings', async (req,res) => {
  const { name, phone, email, service, vehicle, date, time, notes } = req.body;
  if (!name||!phone||!date||!time||!service) return res.status(400).json({ error:'Missing required fields' });

  // Double-book check
  const conflict = getDb().prepare("SELECT id FROM bookings WHERE date=? AND time=? AND status!='cancelled'").get(date, time);
  if (conflict) return res.status(409).json({ error:'That time slot is no longer available. Please choose another.' });

  const info = getDb().prepare('INSERT INTO bookings (name,phone,email,service,vehicle,date,time,notes) VALUES (?,?,?,?,?,?,?,?)').run(name,phone,email||'',service,vehicle||'',date,time,notes||'');

  const shopName = setting('shop_name');
  const shopPhone = setting('phone');
  const shopEmail = setting('email');

  // Notify admin
  await notifyAdmin(
    `📅 New Booking — ${name} — ${service} on ${date}`,
    `<h2>New Booking</h2><table style="border-collapse:collapse;font-family:sans-serif">
      <tr><td style="padding:6px 12px;color:#888">Name</td><td style="padding:6px 12px"><b>${name}</b></td></tr>
      <tr><td style="padding:6px 12px;color:#888">Phone</td><td style="padding:6px 12px">${phone}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">Email</td><td style="padding:6px 12px">${email||'—'}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">Service</td><td style="padding:6px 12px">${service}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">Vehicle</td><td style="padding:6px 12px">${vehicle||'—'}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">Date/Time</td><td style="padding:6px 12px"><b>${date} at ${time}</b></td></tr>
      ${notes?`<tr><td style="padding:6px 12px;color:#888">Notes</td><td style="padding:6px 12px">${notes}</td></tr>`:''}
    </table>`
  );

  // Confirmation to customer
  if (email) {
    await sendMail(email,
      `Booking Confirmed — ${shopName}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#FF6B00;padding:24px;text-align:center">
          <h1 style="color:#000;margin:0;font-size:28px;letter-spacing:2px">${shopName.toUpperCase()}</h1>
        </div>
        <div style="background:#f9f9f9;padding:32px">
          <h2 style="color:#333;margin-top:0">Booking Confirmed ✅</h2>
          <p style="color:#555">Hi ${name}, your booking is confirmed. Here are the details:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#FF6B00"><td style="padding:10px 16px;color:#000;font-weight:bold;width:40%">Service</td><td style="padding:10px 16px;color:#000;font-weight:bold">${service}</td></tr>
            <tr style="background:#fff"><td style="padding:10px 16px;color:#888">Date</td><td style="padding:10px 16px;color:#333;font-weight:bold">${date}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:10px 16px;color:#888">Time</td><td style="padding:10px 16px;color:#333;font-weight:bold">${time}</td></tr>
            ${vehicle?`<tr style="background:#fff"><td style="padding:10px 16px;color:#888">Vehicle</td><td style="padding:10px 16px;color:#333">${vehicle}</td></tr>`:''}
            ${notes?`<tr style="background:#f5f5f5"><td style="padding:10px 16px;color:#888">Notes</td><td style="padding:10px 16px;color:#333">${notes}</td></tr>`:''}
          </table>
          <div style="background:#fff3e0;border-left:4px solid #FF6B00;padding:16px;margin:20px 0">
            <p style="margin:0;color:#555">We'll call you on <strong>${phone}</strong> to confirm. If you need to change or cancel, please contact us:</p>
            <p style="margin:8px 0 0"><strong>${shopPhone}</strong> | <a href="mailto:${shopEmail}" style="color:#FF6B00">${shopEmail}</a></p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px">${setting('address')}</p>
        </div>
      </div>`
    );
  }

  res.status(201).json({ id:info.lastInsertRowid, ok:true });
});

// ════════════════════ ENQUIRIES (public) ══════════════════════════════
app.post('/api/enquiries', async (req,res) => {
  const { name, phone, email, message, items, tyre_size } = req.body;
  if (!name||!phone) return res.status(400).json({ error:'Name and phone required' });

  const info = getDb().prepare('INSERT INTO enquiries (name,phone,email,message,items_json) VALUES (?,?,?,?,?)').run(
    name, phone, email||'', message||'', items ? JSON.stringify(items) : (tyre_size ? JSON.stringify([{size:tyre_size}]) : null)
  );

  const shopName  = setting('shop_name');
  const shopPhone = setting('phone');
  const shopEmail = setting('email');

  // Admin notification
  const itemsHtml = items?.length
    ? `<h3>Items:</h3><ul>${items.map(i=>`<li>${i.brand} ${i.model} ${i.width}/${i.profile}R${i.rim} ×${i.qty} — $${i.price*i.qty}</li>`).join('')}</ul>`
    : tyre_size ? `<p><b>Requested size:</b> ${tyre_size}</p>` : '';

  await notifyAdmin(
    `📩 New Enquiry — ${name}`,
    `<h2>New Enquiry</h2>
    <p><b>Name:</b> ${name}<br><b>Phone:</b> ${phone}<br><b>Email:</b> ${email||'—'}</p>
    ${message?`<p><b>Message:</b> ${message}</p>`:''}${itemsHtml}`
  );

  // Customer confirmation email
  if (email) {
    await sendMail(email,
      `Enquiry Received — ${shopName}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#FF6B00;padding:24px;text-align:center">
          <h1 style="color:#000;margin:0;font-size:28px;letter-spacing:2px">${shopName.toUpperCase()}</h1>
        </div>
        <div style="background:#f9f9f9;padding:32px">
          <h2 style="color:#333;margin-top:0">Thanks for your enquiry, ${name}!</h2>
          <p style="color:#555">We've received your enquiry and will call you on <strong>${phone}</strong> shortly.</p>
          ${message?`<div style="background:#fff;border-left:4px solid #FF6B00;padding:16px;margin:16px 0"><p style="margin:0;color:#555;font-style:italic">"${message}"</p></div>`:''}
          ${items?.length?`<h3 style="color:#333">Tyres you enquired about:</h3><table style="width:100%;border-collapse:collapse">${items.map((i,idx)=>`<tr style="background:${idx%2?'#f5f5f5':'#fff'}"><td style="padding:8px 12px">${i.brand} ${i.model} ${i.width}/${i.profile}R${i.rim}</td><td style="padding:8px 12px;text-align:right;color:#FF6B00;font-weight:bold">$${i.price} ea</td></tr>`).join('')}</table>`:''}
          ${tyre_size&&!items?.length?`<p style="color:#555">Requested size: <strong>${tyre_size}</strong></p>`:''}
          <div style="background:#fff3e0;border-left:4px solid #FF6B00;padding:16px;margin:20px 0">
            <p style="margin:0;color:#555">Questions? Contact us directly:</p>
            <p style="margin:8px 0 0"><strong>${shopPhone}</strong> | <a href="mailto:${shopEmail}" style="color:#FF6B00">${shopEmail}</a></p>
          </div>
          <p style="color:#888;font-size:12px">${setting('address')}</p>
        </div>
      </div>`
    );
  }

  res.status(201).json({ id:info.lastInsertRowid, ok:true });
});

// ════════════════════ SETTINGS (public) ═══════════════════════════════
app.get('/api/settings', (_,res) => {
  const rows = getDb().prepare('SELECT key,value FROM settings').all();
  // Don't expose SMTP password publicly
  const safe = Object.fromEntries(rows.filter(r => r.key !== 'smtp_pass').map(r => [r.key, r.value]));
  res.json(safe);
});

// ════════════════════ ADMIN — TYRES ═══════════════════════════════════
app.post('/api/admin/tyres', requireAuth, (req,res) => {
  const { brand,model,width,profile,rim,condition,price,qty,speed,load_index,description,image_url,warranty,featured } = req.body;
  const info = getDb().prepare(`INSERT INTO tyres (brand,model,width,profile,rim,condition,price,qty,speed,load_index,description,image_url,warranty,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(brand,model,+width,+profile,+rim,condition||'New',+price,+qty,speed||'V',+load_index||91,description||'',image_url||null,warranty||'',featured?1:0);
  res.status(201).json(getDb().prepare('SELECT * FROM tyres WHERE id=?').get(info.lastInsertRowid));
});
app.put('/api/admin/tyres/:id', requireAuth, (req,res) => {
  const { brand,model,width,profile,rim,condition,price,qty,speed,load_index,description,image_url,warranty,featured } = req.body;
  getDb().prepare(`UPDATE tyres SET brand=?,model=?,width=?,profile=?,rim=?,condition=?,price=?,qty=?,speed=?,load_index=?,description=?,image_url=?,warranty=?,featured=? WHERE id=?`).run(brand,model,+width,+profile,+rim,condition,+price,+qty,speed,+load_index,description,image_url??null,warranty||'',featured?1:0,req.params.id);
  res.json(getDb().prepare('SELECT * FROM tyres WHERE id=?').get(req.params.id));
});
app.patch('/api/admin/tyres/:id', requireAuth, (req,res) => {
  const allowed = ['brand','model','width','profile','rim','condition','price','qty','speed','load_index','description','image_url','warranty','featured'];
  const updates = Object.entries(req.body).filter(([k])=>allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error:'No valid fields' });
  getDb().prepare(`UPDATE tyres SET ${updates.map(([k])=>`${k}=?`).join(',')} WHERE id=?`).run(...updates.map(([,v])=>v), req.params.id);
  res.json(getDb().prepare('SELECT * FROM tyres WHERE id=?').get(req.params.id));
});
app.delete('/api/admin/tyres/:id', requireAuth, (req,res) => {
  const t = getDb().prepare('SELECT * FROM tyres WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error:'Not found' });
  if (t.image_url?.startsWith('/uploads/')) { const fp=path.join(UPLOADS_DIR,path.basename(t.image_url)); if(fs.existsSync(fp)) fs.unlinkSync(fp); }
  getDb().prepare('DELETE FROM tyres WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});
app.post('/api/admin/tyres/bulk-price', requireAuth, (req,res) => {
  const { condition, adjustment, type } = req.body;
  let sql = type==='percent' ? `UPDATE tyres SET price=ROUND(price*(1+?/100.0),2)` : `UPDATE tyres SET price=ROUND(price+?,2)`;
  const params = [+adjustment];
  if (condition) { sql+=' WHERE condition=?'; params.push(condition); }
  res.json({ ok:true, updated: getDb().prepare(sql).run(...params).changes });
});
app.get('/api/admin/export/stock', requireAuth, (_,res) => {
  const tyres = getDb().prepare('SELECT * FROM tyres ORDER BY brand,model').all();
  const header = 'Brand,Model,Width,Profile,Rim,Condition,Price,Qty,Speed,Load,Warranty,Featured\n';
  const rows = tyres.map(t=>[
    `"${(t.brand||'').replace(/"/g,'""')}"`,
    `"${(t.model||'').replace(/"/g,'""')}"`,
    t.width, t.profile, t.rim,
    t.condition, t.price, t.qty, t.speed, t.load_index,
    `"${(t.warranty||'').replace(/"/g,'""')}"`,
    t.featured
  ].join(',')).join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="tigertyres_stock.csv"');
  res.send(header+rows);
});

// CSV Import — accepts multipart/form-data with a 'csv' file field
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });
app.post('/api/admin/import/stock', requireAuth, csvUpload.single('csv'), (req,res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const text = req.file.buffer.toString('utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return res.status(400).json({ error: 'File is empty or has no data rows' });

  // Parse header — flexible, case-insensitive
  const rawHeader = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g,''));
  const col = name => {
    const aliases = {
      brand:      ['brand'],
      model:      ['model'],
      width:      ['width','tyre_width','tyrwidth'],
      profile:    ['profile','aspect','aspect_ratio'],
      rim:        ['rim','rim_size','wheel','wheel_size','diameter'],
      condition:  ['condition','cond','new_used','type'],
      price:      ['price','sell_price','retail','retail_price','cost'],
      qty:        ['qty','quantity','stock','in_stock','stock_qty','units'],
      speed:      ['speed','speed_rating','speed_index'],
      load_index: ['load','load_index','load_rating','li'],
      description:['description','desc','notes','comment'],
      warranty:   ['warranty','warr'],
      featured:   ['featured','feature','highlight'],
    };
    for (const alias of (aliases[name] || [name])) {
      const idx = rawHeader.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Required columns
  const required = ['brand','model','width','profile','rim'];
  const missing = required.filter(r => col(r) === -1);
  if (missing.length) {
    return res.status(400).json({
      error: `Missing required columns: ${missing.join(', ')}`,
      hint: 'Required: Brand, Model, Width, Profile, Rim',
      detected_columns: rawHeader
    });
  }

  // Parse a CSV value — handles quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const ins = getDb().prepare(`
    INSERT INTO tyres (brand,model,width,profile,rim,condition,price,qty,speed,load_index,description,warranty,featured)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const errors = [];
  const previewed = [];
  let imported = 0;
  let skipped = 0;

  const importFn = getDb().transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      const g = idx => (idx === -1 ? '' : (parts[idx] || '').trim().replace(/^"|"$/g,''));

      const brand     = g(col('brand'));
      const model     = g(col('model'));
      const width     = parseInt(g(col('width'))) || 0;
      const profile   = parseInt(g(col('profile'))) || 0;
      const rim       = parseInt(g(col('rim'))) || 0;

      if (!brand || !model || !width || !profile || !rim) {
        errors.push(`Row ${i+1}: missing required value (brand="${brand}" model="${model}" size=${width}/${profile}R${rim})`);
        skipped++;
        continue;
      }

      const rawCond   = g(col('condition')).toLowerCase();
      const condition = rawCond.startsWith('u') ? 'Used' : 'New';
      const price     = parseFloat(g(col('price'))) || 0;
      const qty       = parseInt(g(col('qty'))) || 0;
      const speed     = g(col('speed')) || 'V';
      const load_index= parseInt(g(col('load_index'))) || 91;
      const description = g(col('description')) || '';
      const warranty  = g(col('warranty')) || '';
      const featRaw   = g(col('featured')).toLowerCase();
      const featured  = ['1','true','yes','y'].includes(featRaw) ? 1 : 0;

      ins.run(brand, model, width, profile, rim, condition, price, qty, speed, load_index, description, warranty, featured);
      previewed.push({ brand, model, width, profile, rim, condition, price, qty });
      imported++;
    }
  });

  try {
    importFn();
    res.json({ ok: true, imported, skipped, errors: errors.slice(0, 20), rows: previewed });
  } catch(e) {
    res.status(500).json({ error: `Database error: ${e.message}` });
  }
});

// ════════════════════ ADMIN — UPLOAD ══════════════════════════════════
app.post('/api/admin/upload', requireAuth, upload.single('image'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:'No file' });
  res.json({ url:`/uploads/${req.file.filename}` });
});

// ════════════════════ ADMIN — ENQUIRIES ═══════════════════════════════
app.get('/api/admin/enquiries', requireAuth, (_,res) => res.json(getDb().prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all()));
app.patch('/api/admin/enquiries/:id', requireAuth, (req,res) => {
  if (!['new','contacted','completed'].includes(req.body.status)) return res.status(400).json({ error:'Invalid status' });
  getDb().prepare('UPDATE enquiries SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok:true });
});
app.delete('/api/admin/enquiries/:id', requireAuth, (req,res) => { getDb().prepare('DELETE FROM enquiries WHERE id=?').run(req.params.id); res.json({ ok:true }); });

// ════════════════════ ADMIN — BOOKINGS ════════════════════════════════
app.get('/api/admin/bookings', requireAuth, (_,res) => res.json(getDb().prepare('SELECT * FROM bookings ORDER BY date DESC,time DESC').all()));
app.patch('/api/admin/bookings/:id', requireAuth, (req,res) => {
  const { status } = req.body;
  if (!['pending','confirmed','cancelled','completed'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  getDb().prepare('UPDATE bookings SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok:true });
});
app.delete('/api/admin/bookings/:id', requireAuth, (req,res) => { getDb().prepare('DELETE FROM bookings WHERE id=?').run(req.params.id); res.json({ ok:true }); });

// ════════════════════ ADMIN — BLOCKED DATES ═══════════════════════════
app.get('/api/admin/blocked-dates', requireAuth, (_,res) => res.json(getDb().prepare('SELECT * FROM blocked_dates ORDER BY date').all()));
app.post('/api/admin/blocked-dates', requireAuth, (req,res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ error:'Date required' });
  try {
    const info = getDb().prepare('INSERT INTO blocked_dates (date,reason) VALUES (?,?)').run(date, reason||'');
    res.status(201).json(getDb().prepare('SELECT * FROM blocked_dates WHERE id=?').get(info.lastInsertRowid));
  } catch { res.status(409).json({ error:'Date already blocked' }); }
});
app.delete('/api/admin/blocked-dates/:id', requireAuth, (req,res) => { getDb().prepare('DELETE FROM blocked_dates WHERE id=?').run(req.params.id); res.json({ ok:true }); });

// ════════════════════ ADMIN — REVIEWS ════════════════════════════════
app.get('/api/admin/reviews', requireAuth, (_,res) => res.json(getDb().prepare('SELECT r.*,t.brand,t.model FROM reviews r JOIN tyres t ON t.id=r.tyre_id ORDER BY r.created_at DESC').all()));
app.patch('/api/admin/reviews/:id', requireAuth, (req,res) => { getDb().prepare('UPDATE reviews SET approved=? WHERE id=?').run(req.body.approved?1:0, req.params.id); res.json({ ok:true }); });
app.delete('/api/admin/reviews/:id', requireAuth, (req,res) => { getDb().prepare('DELETE FROM reviews WHERE id=?').run(req.params.id); res.json({ ok:true }); });

// ════════════════════ ADMIN — VEHICLES ════════════════════════════════
app.get('/api/admin/vehicles', requireAuth, (_,res) => res.json(getDb().prepare('SELECT * FROM vehicles ORDER BY make,model,year DESC').all()));
app.post('/api/admin/vehicles', requireAuth, (req,res) => {
  const { make,model,year,width,profile,rim,notes } = req.body;
  if (!make||!model||!year) return res.status(400).json({ error:'Make, model, year required' });
  const exists = getDb().prepare('SELECT id FROM vehicles WHERE make=? AND model=? AND year=?').get(make,model,+year);
  if (exists) return res.status(409).json({ error:`${make} ${model} ${year} already exists` });
  const info = getDb().prepare('INSERT INTO vehicles (make,model,year,width,profile,rim,notes) VALUES (?,?,?,?,?,?,?)').run(make,model,+year,+width,+profile,+rim,notes||'');
  res.status(201).json(getDb().prepare('SELECT * FROM vehicles WHERE id=?').get(info.lastInsertRowid));
});
app.put('/api/admin/vehicles/:id', requireAuth, (req,res) => {
  const { make,model,year,width,profile,rim,notes } = req.body;
  getDb().prepare('UPDATE vehicles SET make=?,model=?,year=?,width=?,profile=?,rim=?,notes=? WHERE id=?').run(make,model,+year,+width,+profile,+rim,notes||'',req.params.id);
  res.json(getDb().prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.id));
});
app.delete('/api/admin/vehicles/:id', requireAuth, (req,res) => { getDb().prepare('DELETE FROM vehicles WHERE id=?').run(req.params.id); res.json({ ok:true }); });
app.post('/api/admin/vehicles/bulk', requireAuth, (req,res) => {
  const { vehicles } = req.body;
  if (!Array.isArray(vehicles)) return res.status(400).json({ error:'Expected array' });
  const ins = getDb().prepare('INSERT OR IGNORE INTO vehicles (make,model,year,width,profile,rim,notes) VALUES (?,?,?,?,?,?,?)');
  let added = 0;
  getDb().transaction(rows => { for(const v of rows) { ins.run(v.make,v.model,+v.year,+v.width,+v.profile,+v.rim,v.notes||''); added++; } })(vehicles);
  res.json({ ok:true, added });
});

// ════════════════════ ADMIN — SETTINGS ════════════════════════════════
app.put('/api/admin/settings', requireAuth, (req,res) => {
  const ups = getDb().prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  getDb().transaction(pairs => pairs.forEach(([k,v]) => ups.run(k, String(v))))(Object.entries(req.body));
  res.json({ ok:true });
});

// ════════════════════ ADMIN — STATS ═══════════════════════════════════
app.get('/api/admin/stats', requireAuth, (_,res) => {
  const d = getDb();
  res.json({
    total_skus:      d.prepare('SELECT COUNT(*) as c FROM tyres').get().c,
    total_units:     d.prepare('SELECT COALESCE(SUM(qty),0) as s FROM tyres').get().s,
    new_count:       d.prepare("SELECT COUNT(*) as c FROM tyres WHERE condition='New'").get().c,
    used_count:      d.prepare("SELECT COUNT(*) as c FROM tyres WHERE condition='Used'").get().c,
    low_stock:       d.prepare('SELECT COUNT(*) as c FROM tyres WHERE qty>0 AND qty<=2').get().c,
    out_of_stock:    d.prepare('SELECT COUNT(*) as c FROM tyres WHERE qty=0').get().c,
    new_enquiries:   d.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status='new'").get().c,
    new_bookings:    d.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='pending'").get().c,
    pending_reviews: d.prepare('SELECT COUNT(*) as c FROM reviews WHERE approved=0').get().c,
    stock_value:     d.prepare('SELECT COALESCE(SUM(price*qty),0) as v FROM tyres').get().v,
    vehicle_count:   d.prepare('SELECT COUNT(*) as c FROM vehicles').get().c,
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────
app.get('*', (_,res) => {
  const idx = path.join(FRONTEND_DIST,'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx);
  else res.json({ status:'Tiger Tyres API running' });
});

app.listen(PORT,'0.0.0.0',() => console.log(`\n🐯  Tiger Tyres on port ${PORT}\n`));
