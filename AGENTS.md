# Repository Guidelines

## Project Structure & Module Organization
- App Router source lives in `app/`; `layout.tsx` wires up Clerk, analytics, and global fonts while `page.tsx` renders the dashboard via `useWordOfTheDay`.
- Reusable UI belongs in `app/components/` (e.g. `LanguageToggle.tsx`, `WordCard.tsx`) and domain logic hooks stay in `app/hooks/`; co-locate new files with the feature they support.
- Styling is centralized in `app/globals.css`, which mixes Tailwind v4 utilities with handcrafted CSS variables; prefer extending those tokens instead of inlining hex values.
- Static assets, including Clerk imagery, go in `public/`; authentication middleware lives in `proxy.ts` and should be updated whenever new routes need protecting.

## Build, Test, and Development Commands
- `pnpm install` – restore dependencies; always use pnpm to match the lockfile.
- `pnpm dev` – run the Next.js dev server with hot reload.
- `pnpm lint` – execute the ESLint config in `eslint.config.mjs`; add `--fix` for auto-fixes.
- `pnpm build` / `pnpm start` – produce and serve the production bundle; run before shipping significant changes.

## Coding Style & Naming Conventions
- Stick to TypeScript with 2-space indentation and single quotes as shown in existing modules.
- Components stay `PascalCase`, hooks start with `use`, utility modules stay `camelCase.ts`, and CSS class names mirror Tailwind-style lowercase tokens.
- Let ESLint and TypeScript surface issues instead of suppressing rules; only disable rules inline with a short justification.
- Reuse shared tokens (fonts, colors, spacing) defined in `app/globals.css` and export shared constants via `app/fonts.ts` or a dedicated config module.

## Testing Guidelines
- Automated tests are not yet wired up; when introducing them, prefer React Testing Library or Vitest and place specs alongside code as `*.test.ts(x)` for fast discoverability.
- Add a corresponding npm script (e.g. `pnpm test`) and ensure it runs in CI before merging.
- Until a harness exists, rely on `pnpm lint` and manual verification in `pnpm dev`; document exploratory steps in the PR description so reviewers can reproduce.

## Commit & Pull Request Guidelines
- Follow the existing history: imperative, sentence-case subjects (e.g. “Add Clerk middleware for authentication”) with focused scope.
- Reference related issues in the body, include before/after context, and drop screenshots or recordings for UI changes.
- PRs should outline the change, testing performed, and any follow-up tasks; request reviews from domain owners when touching auth (`proxy.ts`) or shared styling.

## Security & Configuration Tips
- Clerk requires environment keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`); add them via `.env.local` and never commit secrets.
- Update `proxy.ts` matchers when adding new API routes to ensure authentication continues to gate sensitive traffic.
