# JobTracker

A full-stack multi-user job tracking web application with AI-powered job discovery.

## Stack

- **Backend**: Python Flask + SQLite + openpyxl
- **Frontend**: React (Vite) — single `App.jsx`
- **Auth**: Token-based (UUID tokens, stored in SQLite sessions table)
- **AI**: Claude (Anthropic API) — client-side, optional

## Setup

### Backend

```bash
cd backend && pip install -r requirements.txt && python app.py
```

Runs on **http://localhost:5000**

### Frontend

```bash
cd frontend && npm install && npm run dev
```

Runs on **http://localhost:5173**

### AI Tab (optional)

Create `frontend/.env`:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> The AI tab calls Claude directly from the browser. Keep your key local and never commit `.env`.

## Features

- **Multi-user auth** — register/login, tokens persist in `localStorage`
- **Job tracker** — add, edit, delete jobs with status pipeline
- **Stats bar** — counts by status (Saved / Applied / Interview / Offer / Rejected)
- **Search** — filter across company, title, location, industry, status
- **Excel export** — dark-themed `.xlsx` with status-colored rows, frozen headers
- **AI Job Finder** — Claude suggests tailored junior AI/Data positions, save with one click
- **Demo data** — 5 seed jobs added automatically on registration

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
│   ├── app.py              # Flask API (all routes)
│   ├── requirements.txt
│   └── jobtracker.db       # SQLite DB (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Full React SPA
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Create account |
| POST | `/api/login` | Sign in |
| POST | `/api/logout` | Sign out |
| GET | `/api/jobs` | List user's jobs |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/export` | Download Excel file |
| GET | `/api/stats` | Stats by status / location |
