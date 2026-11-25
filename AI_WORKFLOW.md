# AI Workflow Note

This note records how AI was used on this project, what I asked for, what I changed, and how the result was checked. I (Denys Ntwaritaganzwa) understood the assignment, set the direction and made the decisions; Claude Code did most of the implementation under my review.

## Tools used
- **Claude Code (Claude Sonnet 5.5)** for planning, scaffolding, implementation, tests, debugging, browser checks and documentation. It worked in a Linux sandbox with a shell (npm, headless Chrome) and browser access.
- No other AI tools (Copilot, Cursor, ChatGPT, image generators) were used.

## How I approached the work
1. **Understand first.** Before using any AI I read the Ajaia LLC "AI-Native Full Stack Developer Assignment" closely and broke it into the required features (create, rename, edit, autosave, rich text, file import, sharing, persistence), the deliverables (live URL, repository, video, write-ups) and the evaluation criteria. I decided what had to be done well, what could be cut, and which trade-offs I was willing to explain.
2. **Draft my own starting point.** I wrote up my initial brief: the requirements as I understood them, the stack I expected to use, the order of work (required features first, then a few well-tested extras), and the standards I wanted met (server-side permission checks, tests, honest documentation, small incremental commits). I gave Claude Code that draft together with the assignment text and my CV, so the project and the write-ups would reflect my background.
3. **Use AI to refine and build.** Claude Code challenged and tightened my draft into a scoped plan, then implemented it. For each requirement it proposed a test or a documented limitation. I reviewed the plan and the code, and redirected it when I disagreed.
4. **My follow-up directions**, in order:
   - Build everything except the video, which I would record myself.
   - Push to my own GitHub repository, with the work split into **small incremental commits** in my name, and keep the repository free of files that are not needed.
   - Remove the video script and placeholder files, and anything unclear.
   - Deploy the app: I signed in to Vercel and the AI configured the project, the Turso database and the environment variables.
   - Complete the submission and document the AI use (this file).
5. **What I did myself rather than the AI:** push to GitHub from my own machine (the AI's sandbox had no write access to my account), create the Drive folder, record the video, and test the live site by signing in, editing and sharing documents.

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


