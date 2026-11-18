# Repository Guidelines

## Project Structure

- `frontend/src/` contains the React workspace. Pages live in `pages/`, feature components in `components/assistant/`, and CloudBase and API clients in `lib/`. Serve static assets from `frontend/public/`.
- `backend/src/` contains Express. Agent routes, providers, and tools live in `modules/agent/`. EdgeOne loads the same app through `cloud-functions/api/[[default]].ts`.
- `database/` holds CloudBase migrations and permission checks. `shared/` holds Publishable Key helpers, `scripts/` holds tests, and `docs/` describes development and deployment.

## Build and Development

Use Node.js 22.x (EdgeOne builds on 22.17.1). Run commands from the repository root.

- `npm ci` installs both workspaces from the root lockfile.
- Run `npm run dev --workspace backend` and `npm run dev --workspace frontend` in separate terminals. Vite serves port 5173 and proxies `/api` to Express on port 3000.
- `npm run build` type-checks and bundles the frontend into `frontend/dist/`.
- `npm run lint --workspace frontend` runs ESLint. See [development and deployment](docs/dev.md) for backend type-checking and environment setup.

## Coding Style

Use strict TypeScript, two-space indentation, single quotes, and the workspace Prettier settings. Match the surrounding style and keep formatting changes scoped. Name React components in PascalCase, hooks with a `use` prefix, and shared utility files in kebab-case.

## Testing

Name Node tests `scripts/*.test.ts`. Run `npm run test:edgeone` for mocked API behavior, `npm run test:database` for PostgreSQL permissions and migrations, and `npm run test:cloudbase-key` for Key handling. For UI changes, run the relevant `scripts/*-ui-qa.py` script with Python Playwright and Microsoft Edge. Use synthetic credentials and fixtures.

## Commits and Pull Requests

History uses brief `feat:`, `fix:`, and `docs:` subjects. Prefer a descriptive summary such as `fix: preserve chat scroll position`. Explain the user-visible change and validation in the PR, link relevant issues, and include screenshots for UI changes.

## Configuration and Privacy

Start from the workspace `.env.example` files. Keep model credentials server-side and use only the CloudBase Publishable Key in frontend variables. Keep secrets, real case materials, and local QA artifacts out of commits.
