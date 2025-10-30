# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the App Router: `layout.tsx` sets up Clerk, analytics, fonts; `page.tsx` renders the dashboard via `useWordOfTheDay`.
- Feature hooks live under `app/hooks/` and reusable UI in `app/components/` (e.g. `WordCard.tsx`, `AuthControls.tsx`); co-locate new files with their feature to keep imports flat.
- Styling is centralized in `app/globals.css`, which blends Tailwind v4 utilities with custom CSS variables. Extend existing tokens instead of dropping raw hex values.
- Database and schema helpers live in `drizzle/`; static assets belong in `public/`; middleware and auth wiring sit in `proxy.ts` and `app/lib/auth.ts`.

## Build, Test, and Development Commands
- `pnpm install` – restore dependencies; always use pnpm to stay in sync with the lockfile.
- `pnpm dev` – run the Next.js dev server with hot reload on `http://localhost:3000`.
- `pnpm lint` – execute ESLint (`eslint.config.mjs`); add `--fix` before commits when possible.
- `pnpm build` / `pnpm start` – create and serve the production build; run these before shipping larger changes.

## Coding Style & Naming Conventions
- Stick to TypeScript with 2-space indentation and single quotes, matching the existing modules.
- Components use PascalCase (`LanguageToggle.tsx`), hooks start with `use`, utilities are camelCase (`formatDate.ts`), and CSS classes follow tailwind-style lowercase tokens.
- Rely on ESLint and TypeScript diagnostics; only disable rules inline with a short justification.
- Import shared fonts via `app/fonts.ts` and reuse CSS variables declared in `app/globals.css`.

## Testing Guidelines
- Automated tests are not wired up yet. When adding them, prefer Vitest or React Testing Library and colocate specs as `*.test.ts(x)`.
- Introduce a `pnpm test` script and document manual QA steps in the PR until CI exists.
- Run `pnpm lint` and manual browser checks (`pnpm dev`) before opening a PR.

## Commit & Pull Request Guidelines
- Follow the established history: imperative, sentence-case subjects (`Add Clerk middleware for authentication`) with focused scope.
- Reference related issues in the commit body, capture before/after context, and include screenshots or recordings for UI work.
- PRs should describe the change, list testing performed, note follow-up tasks, and request reviews from domain owners when touching shared styling or auth (`proxy.ts`, `app/lib/auth.ts`).

## Security & Configuration Tips
- Keep secrets in `.env.local` and Vercel environment variables; never commit them.
- Configure OAuth providers with callback URLs under `/api/auth/callback/{provider}` and set `BETTER_AUTH_URL` to the deployed base URL.
- Update `proxy.ts` matchers whenever you add routes that require authentication.
