# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs, built for the Ajaia LLC AI-Native Full Stack Developer Assignment.

**Live URL:** https://ajaia-collaborative-docs.vercel.app

## Main features

- **Documents:** create, rename, edit, autosave (1 s debounce), reopen, delete (with confirmation). Save status is always visible: *Saved / Unsaved changes… / Saving… / Save failed — retrying*.
- **Rich text (TipTap):** bold, italic, underline, strikethrough, headings 1–3 (text size variation), bulleted and numbered lists, quotes, alignment, undo/redo. The editor's structured JSON is stored, not plain text, so formatting survives refresh and restart.
- **File import:** `.txt`, `.md`, `.docx` → a new editable document. Validated by extension, MIME type, size (max 2 MB) and content (UTF-8 for text, zip signature for docx).
- **Sharing:** owner shares by email as **Editor** or **Viewer**, changes the level, or revokes access. Dashboard has *All*, *My Documents*, *Shared With Me* and *Recent* views, search, and badges that distinguish owned vs. shared documents.
- **Auth:** email + password login (bcrypt, signed httpOnly session cookie) with three seeded demo accounts.
- **Authorization on the server:** every API call re-checks ownership/share level in one function (`resolveAccess`). Users without access get `404`, so private documents are not even confirmed to exist.

## Tech stack

Next.js 15 (App Router, route handlers) · React 19 · TypeScript · Tailwind CSS 3 · TipTap 3 · Drizzle ORM + libSQL (SQLite file locally, Turso in production) · Zod · jose + bcryptjs · Vitest · Playwright-core (browser e2e).

## Prerequisites

Node.js 20+ and npm. No other services are needed locally.

## Local setup

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (openssl rand -base64 32)
npm run db:setup              # creates tables + seeds demo users (idempotent)
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` locally; `libsql://<db>.turso.io` in production |
| `DATABASE_AUTH_TOKEN` | Turso token (leave empty locally) |
| `AUTH_SECRET` | Secret used to sign session cookies (16+ chars; required in production) |

### Database setup / migrations / seed

Schema is plain idempotent SQL in `src/db/migrate.ts` (`CREATE TABLE IF NOT EXISTS`), run automatically on first request and by `npm run db:push`. `npm run db:seed` inserts the demo users if missing. `npm run db:setup` does both.

## Demo accounts

| Email | Password |
| --- | --- |
| denys@example.com | `AjaiaDemo#2025` |
| sarah@example.com | `AjaiaDemo#2025` |
| alex@example.com | `AjaiaDemo#2025` |

These are demo-only credentials, safe to publish.

## Production build

```bash
npm run build && npm start
```

## Tests

```bash
npm test            # 17 unit/integration tests (Vitest): permissions, persistence, import, validation
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm run check       # all of the above + production build

# Browser end-to-end (15 checks; needs a running server and Chrome):
npm run build && PORT=3000 npm start &
BASE_URL=http://localhost:3000 CHROME_PATH=/usr/bin/google-chrome npm run e2e
```

The e2e script drives a real browser through: login failure, create/rename/format/autosave, refresh persistence, sharing, Shared With Me, editing as the shared user, no-access blocking, `.md` import and rejected `.exe`, revoke, delete confirmation, and mobile overflow. It writes screenshots to `docs/screenshots/`.

## Supported file types

`.txt`, `.md` (Markdown: headings, bold/italic, lists, quotes, code), `.docx` (via mammoth: headings, bold/italic, lists, links). Max 2 MB. Other types are rejected with a clear message. The same limits are shown in the dashboard sidebar.

## Quick manual walkthrough

1. Sign in as Denys → **New document** → type, format, watch *Saved* appear → refresh.
2. **Share** → `sarah@example.com` as *Can edit*.
3. Sign out → sign in as Sarah → **Shared With Me** → open, edit.
4. Back as Denys → Sarah's edit is there. Sign in as Alex and paste the document URL: *Document not found*.
5. **Import file** with a `.md`/`.txt`/`.docx`.

## Deployment

SQLite files do not persist on Vercel's serverless filesystem, so production uses **Turso** (hosted libSQL, free tier) through the same code path.

```bash
# 1. Create a free database
turso db create ajaia-docs && turso db show ajaia-docs --url && turso db tokens create ajaia-docs
# 2. Create the tables + demo users in it
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:setup
# 3. Deploy
npx vercel --prod      # set DATABASE_URL, DATABASE_AUTH_TOKEN, AUTH_SECRET in the Vercel project
```

## Known limitations

- Not real-time: two people editing simultaneously overwrite each other with the last save winning (no CRDT/OT, no live cursors).
- Sharing is by email of an existing account; there are no invitations, sign-up, or password reset (demo accounts are seeded).
- Import: `.docx` images/tables are dropped; `.md` raw HTML is stripped by the editor schema.
- No export, version history, comments, or document attachments.
- No rate limiting on login; CSRF is mitigated with `SameSite=Lax` cookies and JSON-only mutations rather than tokens.
- Not yet deployed from this build environment (no Vercel/Turso credentials were available).
