# Architecture

## Goals and priorities
In the 4–6 hour timebox I prioritised, in order: (1) a complete vertical slice — create → edit → autosave → reopen with real persistence; (2) sharing with enforced backend authorization; (3) file import; (4) tests, validation and docs. Visual polish and extras were deliberately last.

## Stack and why
- **Next.js 15 + React + TypeScript + Tailwind:** one codebase for UI and API, trivial Vercel deploy.
- **TipTap (ProseMirror):** mature rich-text model with JSON output, undo/redo, lists and headings out of the box.
- **Drizzle ORM + libSQL:** my first choice was Prisma + SQLite, but Prisma's engine binaries could not be downloaded in my build sandbox. libSQL turned out better for this assignment: the *same* driver reads a local `file:` SQLite DB in development and a hosted **Turso** DB in production, so data persists on Vercel without code changes (a plain SQLite file would be lost on serverless).
- **Zod** for request validation, **jose** (JWT) + **bcryptjs** for auth, **Vitest** for tests.

## Structure
```
src/db/          schema.ts (Drizzle tables), migrate.ts (idempotent DDL), client.ts (lazy shared connection)
src/lib/         documents.ts (ALL business + authorization logic), auth.ts, validation.ts,
                 import.ts (file → editor JSON), extensions.ts (shared TipTap schema), api.ts (error wrapper)
src/app/api/     thin route handlers: parse → call service → JSON
src/app/         pages: /login, / (dashboard), /docs/[id] (editor; server-checks access before render)
src/components/  Dashboard, Editor, Toolbar, ShareDialog, Modal, Toast
tests/           service-level tests against a real temp SQLite DB
e2e/run.mjs      real-browser end-to-end script
```
Route handlers contain no rules; `src/lib/documents.ts` takes a `db` and a `userId`, which makes the access logic directly testable without HTTP.

## Database design
- `users(id, email unique, name, password_hash, created_at)`
- `documents(id, title, content, owner_id → users, created_at, updated_at)` — `content` is the TipTap JSON document as text.
- `document_shares(id, document_id → documents, user_id → users, permission VIEWER|EDITOR, created_at)` with a unique `(document_id, user_id)` index and `ON DELETE CASCADE`.
The schema is created by idempotent `CREATE TABLE IF NOT EXISTS` statements on first use — simple, no migration tool needed for three tables. A versioned migration tool would be the next step if the schema starts changing.

## Authentication
Email + password. Passwords are bcrypt-hashed; login always runs a bcrypt compare (dummy hash for unknown emails) to avoid user enumeration via timing. A successful login sets a signed JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie, valid 7 days. On every request the user is re-read from the database, so deleted users lose access immediately. `AUTH_SECRET` is mandatory in production.

## Authorization (sharing)
`resolveAccess(db, userId, docId)` returns `OWNER | EDITOR | VIEWER` or throws. Rules:

| Action | Owner | Editor | Viewer | No access |
| --- | --- | --- | --- | --- |
| Read | ✔ | ✔ | ✔ | 404 |
| Edit content | ✔ | ✔ | 403 | 404 |
| Rename | ✔ | 403 | 403 | 404 |
| Delete / manage sharing | ✔ | 403 | 403 | 404 |

Unauthorised users get **404** rather than 403 so a document's existence isn't leaked. The UI hides controls too, but that is cosmetic; every rule above is enforced in the service layer and covered by tests. IDs and permissions from the client are never trusted: ownership is always derived from the database.

## Saving approach
The editor emits TipTap JSON on each change. Changes are debounced (1 s) and sent with `PATCH`. A single save loop guarantees one request in flight; edits made while saving are queued and sent right after, and a failed save is re-queued and retried every 4 s while the status shows an error. Saves also flush when the tab is hidden, and the browser warns on close with unsaved changes. Conflict policy is last-write-wins (see exclusions).

## File import
`POST /api/documents/import` (multipart). Server-side steps: extension allowlist → MIME check → size ≤ 2 MB (also checked from `Content-Length` before reading) → content sniffing (UTF-8 decode for text, `PK` signature for docx) → convert to HTML (escaped paragraphs for `.txt`, `marked` for `.md`, `mammoth` for `.docx`) → `generateJSON` through the *same* TipTap schema the editor uses, which strips anything the editor can't represent (including scripts and unknown attributes) → create a new document owned by the importer. Files themselves are not stored.

## Error handling
A `handle()` wrapper maps `ServiceError` and Zod errors to friendly JSON (`400/401/403/404/413/415`) and turns anything unexpected into a generic 500 message while logging the detail server-side. The client shows errors as toasts or inline alerts.

## Deployment architecture
Vercel (Next.js serverless functions) + Turso (libSQL over HTTPS). Env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`. `npm run db:setup` against the production URL creates tables and demo users.

## Intentionally excluded (and why)
- **Real-time collaboration / CRDT:** biggest scope item; autosave + permissions demonstrate the product flow within the timebox.
- **Sign-up, invitations, password reset:** not needed to demonstrate sharing; seeded accounts keep review simple.
- **Export, comments, version history:** optional stretch; would not outweigh core quality.
- **Attachments storage:** import-to-document covers the "file upload" requirement end to end without needing blob storage.
- **Rate limiting / CSRF tokens:** noted as limitations; SameSite cookies cover the common CSRF case.
