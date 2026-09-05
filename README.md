# Engro Enfrashare Data Portal & Ingestion Engine

> **Repository**: [https://github.com/Techmastergojo/Engro.git](https://github.com/Techmastergojo/Engro.git)  
> **Mobile App Client**: [Engro Connect (Android / Web)](https://github.com/Techmastergojo/Engro-Connect.git)

---

## 🚀 Overview
The **Engro Data Web Portal** is an enterprise-grade, standalone telemetry and operational report management hub for telecommunications infrastructure. It allows operations managers to ingest 3 mission-critical Excel/CSV operational reports into an encrypted SQL database and serves real-time telemetry to mobile field teams via a protected REST API.

---

## 📊 3-in-1 Report Ingestion Pipelines

1. **Report 1: Site Master & Status (`SITE_MASTER`)**
   - **Mode**: *Overlap / Upsert*
   - Refreshes Site Tiers (Platinum / VIP / Gold / Silver), Tenancy, DG capacities, commercial power grid status, and GPS coordinates.
2. **Report 2: NAR Performance (`NAR_PERFORMANCE`)**
   - **Mode**: *Smart Append & Range Merge*
   - Ingests daily or monthly workbooks. Appends daily downtime and NAR availability rates, merges MBU tables, and updates 6-month historical graphs without erasing prior history.
3. **Report 3: Fueling & Generator Activity (`FUEL_ACTIVITY`)**
   - **Mode**: *Smart Append*
   - Ingests daily fuel additions, generator running hours, fuel burns, and tank closing balances.

---

## 🔒 Enterprise Security & Free Cloud Hosting

- **Database**: PostgreSQL (Supabase / Neon 100% Free Tier) or zero-config embedded SQL database.
- **Encryption**: AES-256 at rest, TLS 1.3 in-transit.
- **Protected Sync API**: `GET /api/v1/sync` requires the `x-engro-api-key` header.
- **Free Web Hosting**: 1-click deploy to Vercel or Cloudflare Pages.

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
http://localhost:3001
```

## 🌐 Deploy to Vercel (100% Free Forever)
1. Push to [https://github.com/Techmastergojo/Engro.git](https://github.com/Techmastergojo/Engro.git)
2. Import the repository in [Vercel](https://vercel.com)
3. Instant automatic SSL & global CDN deployment!
