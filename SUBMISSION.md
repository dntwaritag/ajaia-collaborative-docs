# Submission — Ajaia Docs

**Project name:** Ajaia Docs (Ajaia LLC AI-Native Full Stack Developer Assignment)
**Candidate:** Denys Ntwaritaganzwa

## Links
- **Live application URL:** https://ajaia-collaborative-docs.vercel.app
- **GitHub repository:** https://github.com/dntwaritag/ajaia-collaborative-docs
- **Walkthrough video (3–5 min):** https://vimeo.com/1250140588
- **Google Drive folder:** https://drive.google.com/drive/folders/1SrjLYygtdkcZswg3r_lvBDk03nh9dVR9?usp=sharing

## What is included
| Item | Path |
| --- | --- |
| Source code | `src/`, `tests/`, `e2e/`, config files |
| Setup, run, test instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| This file | `SUBMISSION.md` |
| Env template | `.env.example` |
| Automated tests | `tests/documents.test.ts`, `tests/import-validation.test.ts` (Vitest); `e2e/run.mjs` (browser) |
| Screenshots | `docs/screenshots/*.png` |

## Demo accounts (all use password `AjaiaDemo#2025`)
`denys@example.com`, `sarah@example.com`, `alex@example.com`

## AI use
This project was built with AI assistance (Claude Code). `AI_WORKFLOW.md` documents the original instructions I gave, how they were refined, what the AI produced, what I changed or rejected, and how everything was verified.

## How to test
**Document creation:** sign in as Denys → *+ New document* → rename, type, use the toolbar (bold, italic, underline, headings, lists) → status shows *Saved* → refresh; content and formatting remain. Delete from the dashboard asks for confirmation.

**File import:** dashboard → *Import file* → choose a `.txt`, `.md` or `.docx` (≤ 2 MB) → opens as a new editable document. Choose any other type to see the error.

**Sharing:** as Denys open a document → *Share* → `sarah@example.com`, *Can edit* → sign out → sign in as Sarah → *Shared With Me* shows it with a "Shared by Denys" badge → edit it → sign in as Denys to see the change. As Alex, open the document URL: "Document not found". Back as Denys, *Revoke* Sarah (or set her to *Can view* to see the read-only mode).

## Completed features
Create / rename / edit / autosave / reopen / delete documents; rich text with persisted structure; `.txt` `.md` `.docx` import with validation; accounts and login; sharing with Viewer/Editor roles, revoke, permission change; My Documents / Shared With Me / Recent / search; owned-vs-shared badges; backend authorization; validation and friendly errors; persistent database; responsive layout; tests.

## Verification actually run
- Unit/integration: 17 passed. Typecheck, lint and production build: clean.
- Browser e2e (headless Chrome against the production build): 15 of 15 checks passed.
- Manual curl checks of permissions, import (including a real `.docx`) and persistence across a server restart.
- On the live Vercel + Turso deployment, the author manually signed in, created and edited a document, shared it with another account, and edited it as that account. The public login page and the unauthenticated API (401) were also checked from a clean browser.

## Incomplete / not done
- Real-time co-editing (last save wins), sign-up/invites/password reset, export, comments, version history, attachments.
- Only headless Chrome was tested automatically; no manual cross-browser or screen-reader testing.
- Login has no rate limiting, and the demo accounts share one published password.

## With another 2–4 hours
1. Real-time collaboration with Yjs + presence indicators.
2. Export to PDF/Markdown and document version history.
3. Invitations for emails without an account; versioned migrations; login rate limiting.
4. Playwright tests in CI against a preview deployment.
