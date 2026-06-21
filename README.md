# 🐯 Tiger Tyres — Full Stack Tyre Shop

**Napier, New Zealand** — Production-ready tyre shop web application.

## Features
- Customer storefront with vehicle lookup, tyre comparison, cart & enquiry
- Online fitting bookings with real-time slot availability
- Customer reviews (admin-moderated)
- WhatsApp integration
- Full admin panel: stock, pricing, enquiries, bookings, reviews, all site content
- SQLite database, image uploads, JWT auth, email notifications
- Complete content management — edit every word and image on the site from admin

---

## 🚀 Quick Start (Local)

**Requirements:** Node.js 20.x

```bash
# Install everything
cd backend && npm install
cd ../frontend && npm install

# Build frontend
cd frontend && npm run build

# Start server
cd ../backend && node server.js
# Open http://localhost:3001
```

**Dev mode (hot reload):**
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm run dev
# http://localhost:5173
```

---

## 🔐 Default Login

| Username | Password  |
|----------|-----------|
| `tiger`  | `tiger123` |

**Change via Admin → Settings → Change Password before going live.**

---

## 🌐 Deploy to Render

1. Push this folder to a GitHub repo
2. [render.com](https://render.com) → **New → Web Service** → connect repo
3. Set these manually if not auto-detected:
   - **Node Version:** `20`
   - **Build Command:** `cd backend && npm install && cd ../frontend && npm install && npm run build`
   - **Start Command:** `node backend/server.js`
4. Add environment variable: `JWT_SECRET` → click Generate
5. Add a **Disk** (Starter plan+): mount path `/opt/render/project/src/frontend/public/uploads`
6. Deploy!

---

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `JWT_SECRET` | **Required in production** — long random string |
| `UPLOADS_DIR` | Override image storage path |
| `DB_PATH` | Override SQLite file location |

---

## 📁 Structure

```
tigertyres/
├── backend/
│   ├── server.js        # Express API
│   ├── db.js            # SQLite setup & seed data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Full React app
│   │   ├── api.js       # API client
│   │   ├── ui.jsx       # Shared components
│   │   └── main.jsx
│   ├── public/uploads/  # Tyre & logo images
│   ├── index.html
│   └── vite.config.js
├── .node-version        # Pins Node 20 for Render
├── render.yaml          # Render.com config
└── README.md
```

## Tech Stack

| | |
|-|-|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3 v11) |
| Auth | JWT |
| Images | Multer |
| Email | Nodemailer (SMTP) |
