# JobTracker 

Multi-user job tracking app for data science / AI job seekers.

## Deploy (Production)

### Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select the `/backend` folder as root directory
3. Add environment variables:
   - `FRONTEND_URL` = your Vercel URL (e.g. `https://jobtracker-xx.vercel.app`)
   - `DB_PATH` = `/data/jobtracker.db` *(optional — persists DB across deploys with a Railway volume)*
4. Railway auto-detects `Procfile` and runs `gunicorn app:app`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   - `VITE_API_URL` = your Railway backend URL (e.g. `https://jobtracker-production.up.railway.app/api`)
   - `VITE_MISTRAL_API_KEY` = your Mistral API key (get it at [console.mistral.ai](https://console.mistral.ai))
4. Deploy — `vercel.json` handles SPA routing automatically

## Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5000

# Frontend (new terminal)
cd frontend
cp .env.example .env   # fill in VITE_MISTRAL_API_KEY (VITE_API_URL defaults to localhost:5000)
npm install
npm run dev
# → http://localhost:5173
```

## Features

- **Auth** — register/login, UUID tokens persisted in `localStorage`
- **Job tracker** — add, edit, delete jobs with full pipeline
- **Stats dashboard** — counts by status at a glance
- **Search** — filter across company, title, location, industry, status
- **Excel export** — dark-themed `.xlsx` with status-colored rows, frozen headers
- **AI Job Finder** — Mistral finds tailored junior AI/Data positions, one-click save
- **Demo data** — 5 seed jobs auto-added on registration

## Job Statuses

| Status    | Color  |
|-----------|--------|
| Saved     | Blue   |
| Applied   | Orange |
| Interview | Green  |
| Offer     | Purple |
| Rejected  | Red    |

## Project Structure

```
jobtracker/
├── backend/
│   ├── app.py              # Flask API
│   ├── requirements.txt    # flask, flask-cors, openpyxl, gunicorn
│   ├── Procfile            # for Railway: gunicorn app:app
│   └── jobtracker.db       # SQLite (auto-created, gitignored)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Full React SPA
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json         # SPA rewrite rule
│   └── .env.example        # copy to .env and fill keys
└── README.md
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Create account (seeds 5 demo jobs) |
| POST | `/api/login` | Sign in → returns token |
| POST | `/api/logout` | Invalidate token |
| GET | `/api/jobs` | List user's jobs |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/export` | Download styled Excel file |
| GET | `/api/stats` | Stats by status and location |

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `FRONTEND_URL` | Railway | Allowed CORS origin (your Vercel URL) |
| `DB_PATH` | Railway | SQLite path (optional) |
| `VITE_API_URL` | Vercel | Backend URL (Railway app URL + `/api`) |
| `VITE_MISTRAL_API_KEY` | Vercel / local `.env` | Mistral API key for AI tab |
