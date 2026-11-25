# AI Workflow Note

This note records how AI was used on this project, what I asked for, what I changed, and how the result was checked. I (Denys Ntwaritaganzwa) directed the work and made the decisions; the AI did most of the typing.

## Tools used
- **Claude Code (Claude Sonnet 5.5)** for planning, scaffolding, implementation, tests, debugging, browser checks and documentation. It worked in a Linux sandbox with a shell (npm, headless Chrome) and browser access.
- No other AI tools (Copilot, Cursor, ChatGPT, image generators) were used.

## My initial input and how it was refined
1. **What I gave the AI at the start.** A master prompt of my own describing how I wanted the work done, the full text of the Ajaia LLC "AI-Native Full Stack Developer Assignment" (scope, required features, deliverables, evaluation criteria), and my CV, so the project and write-ups would match who I am. My instruction was to follow the prompt and complete the project.
2. **Refinement.** The AI turned the assignment into a scoped plan before coding: required features first (create, rename, edit, autosave, rich text, file import, sharing, persistence), a small set of well-tested extras, and a written list of what to cut. It tied each assignment requirement to a test or a documented limitation.
3. **My follow-up directions**, in order:
   - "Do everything except the video": I would record the video myself.
   - Push to my own GitHub repository, with the work split into **small incremental commits** in my name, and keep the repo free of files that were not needed.
   - Remove the video script and placeholder files from the repository, and anything unclear.
   - Deploy the app: I signed in to Vercel and the AI configured the project, the Turso database and the environment variables.
   - Update the repository so the submission is complete, and document the AI use (this file).
4. **What the AI could not do, so I did it:** push to GitHub (the sandbox had no write access to my account; I pushed from my own machine), create the Drive folder in my account, record the video, and run the final manual check on the live site.

## Where AI materially sped things up
- **Scaffolding:** project config, Tailwind/ESLint/TypeScript setup, route handlers, Zod validation and the dashboard/editor UI.
- **Tests:** the permission matrix (owner / editor / viewer / no access) and import edge cases were enumerated and encoded as 17 tests.
- **Browser end-to-end script:** a 15-check Playwright script run against the production build, which also generated the screenshots in `docs/screenshots/`.
- **Documentation:** README, architecture and submission files were drafted from the actual code and then checked against it.
- **Deployment:** Vercel and Turso setup and diagnosing environment issues.

## AI output that was changed or rejected
- **Prisma → Drizzle + libSQL.** The first schema used Prisma with SQLite. `prisma db push` failed because the sandbox blocks Prisma's engine download, so that code was discarded. Drizzle with libSQL also solves persistence on Vercel (a local file locally, Turso in production, one driver), so it is the better fit.
- **Underline extension:** the first dependency list included `@tiptap/extension-underline`; TipTap 3's StarterKit already bundles it, so the dependency was removed.
- **401 handling bug:** the first API client redirected to `/login` on any 401. The e2e test showed this swallowed the "Incorrect email or password" message. Fixed by excluding `/api/auth/*` from the redirect, then the whole suite was re-run.
- **TypeScript CSS import error:** TS 6 flagged the side-effect CSS import; fixed with `src/css.d.ts`.
- **Production database setup:** the app now reads either `DATABASE_*` or Turso's `TURSO_*` variables, and creates its tables and demo users on first start. This was needed because the Vercel integration sets the Turso names and no one runs a separate setup command in production.
- **Docs and repo tidy-up:** AI-written placeholders (video script, video URL file, "not deployed yet" statements) were removed or replaced with the real links once those existed.

## How correctness was verified
- `npm test`: 17 Vitest tests on a real temporary SQLite database. They cover create/save/retrieve with formatting preserved, 404 for non-members, editor/viewer/owner rules, revoke, delete cascade, search escaping, import success and rejection paths, and validation.
- `npm run typecheck`, `npm run lint`, `npm run build`: clean.
- `curl` checks against the production server for auth, 401/403/404/400/413/415 responses, a real `.docx` import, and a server restart confirming documents and shares persisted.
- `npm run e2e`: 15 browser checks in headless Chrome covering the full user flow, plus a visual review of the screenshots.
- **Live site, by me:** I signed in on the deployed Vercel app, created and edited a document, shared it with another account, and edited it as that account. The AI separately confirmed the public login page and the unauthenticated API response (401) from a clean browser. The AI could not type passwords in its browser, so it could not run the live login itself.

## What still relies on human judgment
- The scope cuts (no real-time collaboration, sign-up or export) and their trade-offs are listed in `ARCHITECTURE.md` and are my decisions.
- Keyboard-only use, screen readers and browsers other than Chrome were not tested.
