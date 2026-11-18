# Walkthrough video script (target 4:00, max 5:00)

Prep: run `npm run db:setup`, start the app (or use the live URL), open two browser profiles (Denys, Sarah). Delete leftover docs for a clean dashboard.

**0:00–0:25 Intro.** "I'm Denys. This is Ajaia Docs, a lightweight Google-Docs-style editor: Next.js, TipTap, Drizzle on SQLite/Turso. I'll show the main flow, then my technical choices, what I cut, and how I used AI."

**0:25–1:00 Dashboard and creation.** Sign in as Denys. Point out sidebar (All / My Documents / Shared With Me / Recent), search, supported import types. Click *New document*; rename it "Q3 Launch Plan".

**1:00–1:50 Editing and formatting.** Heading 1, bold, italic, underline, bulleted and numbered lists, undo/redo. Point at the status indicator: *Unsaved → Saving → Saved*.

**1:50–2:15 Save and reopen.** Refresh the page: formatting and title persist. Go back to the dashboard and reopen it.

**2:15–2:50 Import.** Click *Import file*, pick a prepared `.md`; it opens as a new editable document with headings/lists. Try a `.exe` to show the clear error. Edit, refresh.

**2:50–3:35 Sharing.** Share with sarah@example.com as *Can edit*. Switch to Sarah's window: *Shared With Me*, badge "Shared by Denys · Can edit", edit the doc. Back in Denys: edit is there. Show Alex (or a viewer) is blocked: "Document not found". Revoke Sarah.

**3:35–4:10 Technical decisions.** Service layer owns authorization (`resolveAccess`), routes are thin; TipTap JSON stored, not plain text; libSQL = same code locally and on Turso for Vercel persistence; 404 for no-access to avoid leaking existence; 17 unit tests + 15-step browser e2e.

**4:10–4:35 Intentionally excluded.** Real-time collaboration (last-write-wins today), sign-up/invites/reset, export, comments/versions, attachment storage. Next with 2–4 hours: Yjs real-time editing, export to PDF/Markdown, version history.

**4:35–5:00 AI workflow.** Used Claude Code for scaffolding, tests and docs. Rejected Prisma when its engines couldn't install, and the e2e test caught a login-error bug the unit tests missed. Verified by running tests, build, curl checks, a restart, and browser flows. Close with the live URL.
