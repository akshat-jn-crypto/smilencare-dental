# Smile'n'Care Dental Clinic — Website

A modern, mobile-responsive website for **Smile'n'Care Dental Clinic** (East Delhi),
with an online **appointment booking system** that prevents double-booking.

> *"There is nothing more beautiful than a healthy smile."*

---

## What's inside

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Hero, tagline, trust signals, services overview, CTAs |
| Services | `services.html` | Full, grouped list of treatments |
| Book a Consultation | `book.html` | Date picker + time slots + booking form (core feature) |
| About & Contact | `about.html` | Phone, email, WhatsApp, Facebook, hours, map |
| Gallery | `gallery.html` | Placeholder image grid (swap in real photos) |

```
.
├── index.html  services.html  book.html  about.html  gallery.html
├── assets/
│   ├── css/styles.css          # all styling / design system
│   ├── js/config.js            # ← edit clinic info & booking rules here
│   ├── js/booking-store.js     # data layer (Supabase or demo)
│   ├── js/booking.js           # booking page logic
│   ├── js/main.js              # nav, animations
│   └── favicon.svg
├── supabase-schema.sql         # run this to enable real-time booking
├── netlify.toml                # optional deploy config
└── README.md
```

Pure HTML/CSS/JS — **no build step, no dependencies to install.**

---

## Run it locally

Just open `index.html` in your browser. For the booking page to work best
(modules load over HTTP), serve the folder instead:

```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000
```

---

## The booking system

- Shows only **upcoming working days** (default **Mon–Sat**).
- For each day, shows **time slots** for the configured sessions
  (default **10:00 AM–1:00 PM** and **5:00 PM–8:00 PM**, **30-min** intervals).
- Collects **name, phone, email, service, reason** + the chosen slot.
- A booked slot is **disabled and struck through** so it can't be re-booked.

### Two modes

| Mode | When | Slot locking |
|------|------|--------------|
| **Demo** (default) | No Supabase keys set | Per-browser only (localStorage). Great for testing — zero setup. |
| **Live** | Supabase keys set | **Real-time, cross-patient.** A slot booked by anyone disappears for everyone instantly, and double-booking is impossible. |

The page shows a small badge (top-right of the booking panel) telling you
which mode is active.

### Configure everything in `assets/js/config.js`

```js
booking: {
  workingDays: [1,2,3,4,5,6],   // 0=Sun … 6=Sat  (Mon–Sat by default)
  daysAhead: 30,                // how far ahead patients can book
  slotMinutes: 30,              // slot length
  sessions: [
    { label: "Morning", start: "09:00", end: "14:30" },
    { label: "Evening", start: "17:00", end: "21:00" }
  ],
  blockedDates: ["2026-08-15"], // holidays (optional)
  leadTimeMinutes: 60           // hide slots starting too soon
}
```

---

## Enable real-time booking (free, ~5 minutes)

This makes booked slots vanish for **all** visitors and stops double-booking.

1. Create a free account at **https://supabase.com** → **New project**
   (pick any name/password; the free tier is plenty).
2. In the project, open **SQL Editor → New query**, paste the entire contents
   of **`supabase-schema.sql`**, and click **Run**. (This creates the tables,
   the anti-double-booking trigger, security rules, and realtime — patient
   details stay private and are never exposed to the website.)
3. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
4. Paste them into `assets/js/config.js`:
   ```js
   supabase: {
     url: "https://YOUR-PROJECT.supabase.co",
     anonKey: "eyJhbGciOi...your-anon-key..."
   }
   ```
5. Reload the booking page — the badge should now read **“Live availability”.**

**See your appointments:** Supabase Dashboard → **Table Editor → `bookings`**
(or get email/WhatsApp notifications using Supabase Database Webhooks).

> The `anon` key is safe to ship in the website — security rules let the public
> only *create* a booking and *read which slots are taken*, never read patient
> contact details.

---

## Deploy for free

The site is plain static files, so any free host works. Easiest first:

### Option A — Netlify Drop (no account juggling, ~1 min)
1. Go to **https://app.netlify.com/drop**
2. Drag this whole project **folder** onto the page.
3. You get a live URL instantly (e.g. `random-name.netlify.app`).
4. (Optional) Sign in to keep it, rename the subdomain, or add a custom domain.

### Option B — Vercel
1. Push this folder to a GitHub repo.
2. **https://vercel.com → Add New → Project →** import the repo.
3. Framework preset: **Other**. Click **Deploy**.

### Option C — GitHub Pages
1. Create a GitHub repo and upload these files.
2. Repo **Settings → Pages →** Source: `main` branch, `/root`. Save.
3. Site goes live at `https://<username>.github.io/<repo>/`.

### Option D — Cloudflare Pages
1. Push to GitHub, then **Cloudflare dashboard → Pages → Create → Connect repo.**
2. Build command: *(none)*, Output dir: `/`. Deploy.

> **Tip:** Set up Supabase (above) *before or after* deploying — just edit
> `config.js` and re-upload/redeploy.

---

## Customising

- **Clinic details / links:** `assets/js/config.js` and the footer in each `.html`.
- **Colours & fonts:** the `:root` variables at the top of `assets/css/styles.css`.
- **Photos:** the home page and gallery use professional dental stock photos in
  `assets/images/` (the original site's gallery is JS-loaded and couldn't be
  scraped). To use your own, just drop files into `assets/images/` and update the
  `src` of the `<img>` tags in `index.html` / `gallery.html`.
- **Map:** in `about.html`, replace the `q=` value in the map `<iframe>` with your
  exact address, or paste a Google Maps **“Embed a map”** link for an exact pin.
- **Trust-signal stats** (years, patients, etc.) are placeholders on the home page —
  update the numbers in `index.html`.

---

## Contact (clinic)

- 👩‍⚕️ **Dr. Sarika Jain** (interview aired on Sahara TV)
- 📞 / WhatsApp: **9818670489**
- ✉️ sarikatayaljain@yahoo.in
- 📘 facebook.com/dental.clinic.east.delhi
- 📍 UG-11, B-10, Surya Nagar, Ghaziabad-201011, UP (East Delhi border)
- 🕒 Mon–Sat: 9:00 AM–2:30 PM & 5:00 PM–9:00 PM · Sun by prior appointment
