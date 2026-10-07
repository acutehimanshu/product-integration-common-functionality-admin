# product-integration-common-functionality-admin

The **Marketbase admin portal**: the team's admin tool: users, seller verification, moderation, orders, disputes, payouts, ledger, reports, subscriptions, content, settings, admin accounts and the activity log.

Built with React, Vite, React Router, TypeScript, Tailwind CSS and TanStack Query.
Shared code (domain rules, design system)
comes from the `@acutehimanshu/*` packages published by
[product-integration-common-functionality-shared](https://github.com/acutehimanshu/product-integration-common-functionality-shared), which also holds the mock API
and the end-to-end tests.

## How the four repos fit together

| Repo                                                                                                                                | What it is                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [product-integration-common-functionality-shared](https://github.com/acutehimanshu/product-integration-common-functionality-shared) | Shared packages `@acutehimanshu/*`, the mock API, the API contract and the end-to-end tests |
| [product-integration-common-functionality-buyer](https://github.com/acutehimanshu/product-integration-common-functionality-buyer)   | buyer portal (Next.js, port 3200)                                                           |
| [product-integration-common-functionality-seller](https://github.com/acutehimanshu/product-integration-common-functionality-seller) | seller portal (Next.js, port 3300)                                                          |
| [product-integration-common-functionality-admin](https://github.com/acutehimanshu/product-integration-common-functionality-admin)   | admin portal (React + Vite, port 3400)                                                      |

The apps never import each other. Everything they share comes from the
`@acutehimanshu/*` packages, which product-integration-common-functionality-shared publishes to GitHub
Packages and each app installs at a version. Shared code is changed **only**
in product-integration-common-functionality-shared.

## Prerequisites

- **Node.js 22** or newer.
- **pnpm 12**: run `corepack enable` once (it ships with Node), and the right
  pnpm version is used automatically.
- **Git**, and access to the Marketbase repos on GitHub.
- **A GitHub token for the shared packages.** The `@acutehimanshu/*` packages live
  on GitHub Packages, which always needs a token to install, even for public
  packages:
  1. GitHub → **Settings → Developer settings → Personal access tokens →
     Tokens (classic) → Generate new token (classic)**.
  2. Tick **`read:packages`** (and **`write:packages`** only if you'll
     publish from your own machine; normally CI does that).
  3. Copy the token and keep it out of git: it goes in an environment
     variable, never in a file you commit.

**Once per machine**, tell pnpm to use that token for GitHub Packages. pnpm
reads registry tokens only from your **user-level** `~/.npmrc` (not the
repo's `.npmrc`, which only says where the `@acutehimanshu/*` packages live).
Add one line that reads the token from an environment variable:

```bash
# macOS / Linux / Git Bash
echo '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' >> ~/.npmrc
```

```powershell
# Windows PowerShell
Add-Content "$HOME\.npmrc" '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}'
```

Then set the token in your terminal before `pnpm install`:

```bash
# macOS / Linux / Git Bash
export NODE_AUTH_TOKEN=<your token>
```

```powershell
# Windows PowerShell (this session; setx NODE_AUTH_TOKEN "<token>" keeps it for new terminals)
$env:NODE_AUTH_TOKEN = "<your token>"
```

If `pnpm install` says **401 / authentication token not provided**, the
`~/.npmrc` line is missing; **403** means the token lacks `read:packages`
or can't see the repo.

## Setup

```bash
git clone https://github.com/acutehimanshu/product-integration-common-functionality-admin.git
cd product-integration-common-functionality-admin
pnpm install                  # with NODE_AUTH_TOKEN set (see above)
cp .env.example .env.local    # PowerShell: Copy-Item .env.example .env.local
pnpm dev                      # http://localhost:3400
```

The app needs a backend. For development, run the mock API from
[product-integration-common-functionality-shared](https://github.com/acutehimanshu/product-integration-common-functionality-shared) (`pnpm dev` there; port 3100):
`.env.example` already points at it. Environment variables (see
`.env.example` for what each does): `VITE_API_BASE_URL`, `VITE_MODULES_OFF`, `VITE_MODULES_ON`.

## Commands

| Command                        | What it does                                          |
| ------------------------------ | ----------------------------------------------------- |
| `pnpm dev`                     | Development server on port 3400                       |
| `pnpm build` / `pnpm start`    | Production build / serve it                           |
| `pnpm test`                    | Unit tests (Vitest + Testing Library)                 |
| `pnpm test:coverage`           | Unit tests with coverage (fails below the thresholds) |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript                                   |
| `pnpm format`                  | Formats everything with Prettier                      |
| `pnpm lint:sonar:gate`         | SonarQube rules: fails if issues increase             |

## Project structure

| Path                | What                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/modules/<id>/` | One screen each (manifest, page, sub-pages, tests); switch modules on or off in `src/modules/index.ts` |
| `src/components/`   | Shared admin components (dialogs, filters, history, the activity log)                                  |
| `src/lib/`          | API client, auth, helpers; `env.ts` is the only place env vars are read                                |
| `src/router.tsx`    | Mounts the enabled modules                                                                             |

## Using a new version of the shared packages

Shared code is never edited here. When product-integration-common-functionality-shared releases a new
version:

```bash
pnpm up "@acutehimanshu/*@<version>"
pnpm typecheck && pnpm test && pnpm build
```

Need a change in shared code? Make it in product-integration-common-functionality-shared, release it,
then update here.

## Running the whole platform locally

Clone the four repos **next to each other** (same parent folder):

```bash
git clone https://github.com/acutehimanshu/product-integration-common-functionality-shared.git
git clone https://github.com/acutehimanshu/product-integration-common-functionality-buyer.git
git clone https://github.com/acutehimanshu/product-integration-common-functionality-seller.git
git clone https://github.com/acutehimanshu/product-integration-common-functionality-admin.git
```

Then, with `NODE_AUTH_TOKEN` set, run `pnpm install` in each, and start:

| Terminal | Folder                                          | Command    | Opens                             |
| -------- | ----------------------------------------------- | ---------- | --------------------------------- |
| 1        | product-integration-common-functionality-shared | `pnpm dev` | Mock API on http://localhost:3100 |
| 2        | product-integration-common-functionality-buyer  | `pnpm dev` | http://localhost:3200             |
| 3        | product-integration-common-functionality-seller | `pnpm dev` | http://localhost:3300             |
| 4        | product-integration-common-functionality-admin  | `pnpm dev` | http://localhost:3400             |

Before the first run, copy `.env.example` to `.env.local` in each app (the
defaults already point at the mock).

**Logging in (mock only):** buyers and sellers sign in with any email; the
mock shows the one-time code on screen ("Test mode") instead of emailing it.
Admin test accounts all use the password `marketbase-admin-test`:
`admin@marketbase.test` (super admin), `ops@marketbase.test`,
`trust@marketbase.test`, `finance@marketbase.test`, `content@marketbase.test`.
The mock keeps everything in memory, so restarting it resets the data.

## Quality gates

Every pull request must pass these (CI runs them; run them locally first):

```bash
pnpm format:check     # Prettier (pnpm format fixes it)
pnpm lint             # ESLint, type-aware rules
pnpm lint:sonar:gate  # SonarQube rules: fails if any rule gets more issues than sonar-baseline.json
pnpm typecheck        # TypeScript (strict, noUncheckedIndexedAccess)
pnpm test:coverage    # unit tests; fails if coverage drops below the thresholds in `vite.config.ts` (the `test.coverage` block)
```

- **Sonar baseline:** don't add Sonar issues. After you fix some, run
  `pnpm lint:sonar:gate --update` and commit the lower `sonar-baseline.json`.
  Never raise it to make CI pass.
- **Coverage thresholds:** when you add tests, raise the thresholds in
  `vite.config.ts` (the `test.coverage` block) to the new numbers so they can't slip back.
- **Commits:** Conventional Commits with a lowercase subject
  (`feat: add saved searches`, `fix(cart): …`), checked by a commit hook;
  the pre-commit hook formats staged files.
- **Conventions** (structure, data fetching, auth, forms, accessibility,
  errors): `AGENTS.md`. Read it before adding a feature.

## CI

`.github/workflows/ci.yml` runs the quality gates and a production build on
every push and PR. It needs one secret, **`PACKAGES_TOKEN`**: a token with
`read:packages` (Settings → Secrets and variables → Actions → New repository
secret). The end-to-end tests for all three apps run from
product-integration-common-functionality-shared.

## Deploying

`pnpm build` produces static files in `dist/`. Serve them from any static
host or CDN with a fallback to `index.html` (it's a single-page app). The
`VITE_*` variables are read **at build time**: set them in the build
environment and rebuild after changing them.
