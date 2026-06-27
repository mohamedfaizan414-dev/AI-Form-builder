# Formix — AI-Powered Dynamic Form Builder

Describe a form in plain English and get a fully working, premium dark-themed form in seconds. Refine it through chat. Get an AI executive summary of submissions. Now with accounts — log in to see only the forms you've created and their responses.

## Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, lucide-react
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Neon), JSONB for dynamic schemas/submissions
- **AI:** Groq (Llama 3.3 70B), JSON-mode structured generation
- **Auth:** Email/password (JWT + bcrypt) and Google Sign-In

## Project structure
```
backend/
  .env.example
  package.json
  server.js
  db.js
  schema.sql
  middleware/
    auth.js     # JWT verification middleware
  routes/
    auth.js     # signup / login / google / me
    ai.js       # generate / refine / summarize
    forms.js    # CRUD + submissions (owner-scoped)
frontend/
  .env.example
  package.json
  tailwind.config.js
  app/
    layout.js
    page.js              # dashboard (requires login)
    login/page.js
    signup/page.js
    context/AuthContext.js
    components/GoogleButton.js
    builder/page.js       # AI chat + live preview + copy link
    form/[id]/page.js     # public submission page (no login needed)
```

## Setup

### 1. Database (Neon)
1. Create a free Neon Postgres project at https://neon.tech
2. Copy the connection string into `backend/.env` as `DATABASE_URL`
3. Run the schema (creates `users`, `forms`, `submissions`):
   ```bash
   cd backend
   npm install
   cp .env.example .env   # fill in your values
   npm run db:init
   ```
   This is safe to re-run on an existing database — it uses `CREATE TABLE IF NOT EXISTS` and an `ADD COLUMN IF NOT EXISTS` migration for `forms.user_id`.

### 2. Google Sign-In (optional but recommended)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an **OAuth client ID** of type "Web application"
3. Add `http://localhost:3000` to Authorized JavaScript origins (and your production domain later)
4. Copy the Client ID into **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/.env.local` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

If you skip this, email/password signup and login still work fully — the Google button just shows a small "not configured" notice instead.

### 3. Backend
```bash
cd backend
npm install
npm run dev      # http://localhost:5000
```
Requires `GROQ_API_KEY` for AI routes, `JWT_SECRET` for auth.

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
```

## How accounts work
- Sign up or log in at `/signup` / `/login` (email+password or Google).
- The dashboard (`/`) only shows forms created by the logged-in user.
- Every form's submissions and AI summary are scoped to its owner — other users can't read or edit them via the API even if they guess the form ID.
- The **public fill-out page** (`/form/[id]`) intentionally requires no login, so anyone with the link can respond.
- Use the **Copy link** button (on the dashboard cards and in the builder header) to grab a shareable URL to `/form/[id]`.

## API summary
- `POST /api/auth/signup` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/google` `{ idToken }`
- `GET  /api/auth/me` (auth required)
- `POST /api/ai/generate` `{ prompt }` (auth required) → `{ schema }`
- `POST /api/ai/refine` `{ currentSchema, instruction }` (auth required) → `{ schema }`
- `GET  /api/ai/summarize/:formId` (auth + ownership) → `{ summary }`
- `POST /api/forms` (auth required) / `GET /api/forms` (auth, scoped to caller)
- `GET /api/forms/:id` (public — powers the fill-out page)
- `PUT /api/forms/:id` / `DELETE /api/forms/:id` (auth + ownership)
- `POST /api/forms/:id/submit` `{ answers }` (public — anyone with the link)
- `GET  /api/forms/:id/submissions` (auth + ownership)

## Notes
- All secrets are read from `process.env` only — never hardcoded.
- `forms.schema`, `forms.theme`, and `submissions.answers` are `JSONB`, so any field set is supported without migrations.
- Passwords are hashed with bcrypt; sessions are stateless JWTs stored in `localStorage` on the client and sent as `Authorization: Bearer <token>`.
