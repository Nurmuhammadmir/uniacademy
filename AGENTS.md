# Lamus Water Delivery CRM

A MERN app (MongoDB, Express, React, Node) with Tailwind CSS, split into two
independent projects with their own `package.json`: `frontend/` and `backend/`.

> **Note on Figma Make:** this app originally lived at the repo root so
> Figma Make's built-in dev server (`.figma/make/dev`, which runs
> `pnpm run dev` against a root `package.json`) could drive the live preview
> panel automatically. The app was later split into `frontend/` + `backend/`
> at the user's request, which moves `package.json` out of the root — so
> Figma Make's automatic preview/build/deploy scripts no longer apply. Run
> and preview the app manually (see below) instead of relying on the panel.

## Project Structure

- `frontend/` — Vite + React 19 + Tailwind CSS v4 app (formerly the repo root)
  - `frontend/src/main.tsx` — React entrypoint; imports `src/index.css` and mounts `src/App.tsx`
  - `frontend/src/App.tsx` — routes and top-level providers
  - `frontend/src/context/` — `AuthContext`, `AdminContext`, `ManagerContext`: each holds state + every axios call for its domain, no separate API layer (see `frontend/src/imports/pasted_text/mern-code-style.md` for the full convention)
  - `frontend/src/pages/admin/`, `frontend/src/pages/manager/` — role-specific pages
  - `frontend/.env` — `VITE_BACKEND_URL`, `VITE_MAPBOX_TOKEN` (copy from `.env.example`, never commit)
  - `frontend/.figma/` — Figma Make platform metadata, moved here so `vite.config.ts`'s relative import still resolves; no longer actively used by the platform since `package.json` isn't at the repo root
  - `frontend/src/i18n/translations.ts` — flat-key EN/RU/UZ dictionary; `frontend/src/context/LanguageContext.tsx` exposes `t(key, vars?)` for UI strings and `tServer(message?)` to localize known backend error strings (mapped in `SERVER_MESSAGE_KEYS`). Language persists to `localStorage`; switch it with `<LanguageSwitcher />`.
  - `frontend/src/i18n/quotes.ts` — bank of 50 EN/RU/UZ motivational quotes for managers; `getQuoteOfTheDay()` picks one deterministically per calendar day. Rendered by `<QuoteOfTheDay />` on the manager dashboard.
- `backend/` — Express + Mongoose API
  - `backend/server.js` — app entrypoint, mounts routers under `/api/<role>`
  - `backend/config/mongodb.js` — `connectDB()`, reads `MONGODB_URI`
  - `backend/models/` — `userModel` (admin+manager), `clientModel`, `orderModel`, `stockModel` (singleton warehouse bottle count)
  - `backend/controllers/`, `backend/routes/`, `backend/middlewares/` — one file per resource/role
  - `backend/seed.js` — creates the first admin account directly in the DB (`npm run seed`); only needed once, since there's no public registration route
  - `backend/.env` — `MONGODB_URI`, `JWT_SECRET`, `PORT` (copy from `.env.example`, never commit)

## Running locally

Backend:
```
cd backend
npm install
# fill in backend/.env (MONGODB_URI, JWT_SECRET)
npm run seed   # first time only — creates the initial admin account
npm run dev    # starts on PORT (default 4000)
```

Frontend:
```
cd frontend
pnpm install   # or npm install
# fill in frontend/.env (VITE_BACKEND_URL, VITE_MAPBOX_TOKEN)
pnpm run dev   # starts on PORT env var (default 8443)
```

## Auth convention

JWT is sent as a plain custom `token` header (not `Authorization: Bearer`).
`backend/middlewares/authAdmin.js` / `authManager.js` read `req.headers.token`.
The frontend sets this globally via `axios.defaults.headers.common['token']`
in `AuthContext` after login — no per-request header wiring needed elsewhere.

## Internationalization

The whole UI (admin + manager) is translated into English, Russian, and Uzbek.
Every user-facing string must go through `t('namespace.key')` from
`useLanguage()` — never hardcode display text. When adding new UI text, add
the key to all three language blocks in `frontend/src/i18n/translations.ts`
(`en`, `ru`, `uz`) in the same edit; a missing key silently falls back to the
English string, which is easy to miss in review. Interpolate with
`t('key', { var: value })` against `{var}` placeholders in the dictionary.

## Stock tracking

`stockModel` holds a single warehouse document (`totalBottles`) — bottles not
currently out with any client. `orderController.recordOrder` debits/credits
it by `netBottles` (`bottlesGiven - bottlesReturned`) on every delivery, so it
stays in sync automatically. The "grand total" bottle count shown on the
manager Stock page is `totalStock (warehouse) + bottlesOut (held by clients)`
— don't treat `totalStock` alone as the business-wide total.

## Styling

`frontend/` uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin
configured in `frontend/vite.config.ts`. `frontend/src/index.css` imports
Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly
in JSX; put global CSS or Tailwind v4 theme customization in
`frontend/src/index.css`.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Backend controllers always respond with `res.json({ success: true/false, ... })`, never `res.status(4xx)` — the frontend branches on the `success` boolean.
