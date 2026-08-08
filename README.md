# DeepSurg

Marketing site for DeepSurg, an AI medical company — **Angular 20** front end, **NestJS 11** API.

```
DeepSurg/
├─ frontend/   Angular 20 (standalone components, signals, SCSS)
└─ backend/    NestJS 11 (REST API under /api)
```

## Running it

Install once:

```powershell
npm install            # root tooling (concurrently)
npm run install:all    # frontend + backend dependencies
```

Then start both:

```powershell
npm run dev
```

| App      | URL                            |
| -------- | ------------------------------ |
| Frontend | http://localhost:4200          |
| API      | http://localhost:3000/api      |

The Angular dev server proxies `/api` to the NestJS server (`frontend/proxy.conf.json`), so
the browser only ever talks to one origin. To run either side alone: `npm run dev:web`,
`npm run dev:api`. If port 4200 is busy: `npm --prefix frontend start -- --port 4300`.

## Design

- **Palette** — mostly white, a little blue (`#2563eb`), a touch of purple (`#8b5cf6`).
  All tokens live in `frontend/src/styles.scss` under `:root`, so retheming is one file.
- **Logo** — `frontend/public/logo-deepsurg.webp` is the supplied white-on-transparent
  combined logo. The header and footer use it as a CSS `mask` and paint it with
  `--ds-brand` (`#1a18be`, sampled from the brand artwork), so the logo can be retinted
  from a single token and never carries a background box. `public/favicon.png` is the
  burst mark on its own.
- **Hero background** — `frontend/src/app/shared/nerve-background/nerve-background.ts`
  draws a nerve network on a canvas: neurons wired by curved axons, with action potentials
  travelling along them and relaying at each junction, leaving a glowing tail. It runs
  outside the Angular zone, rebuilds on resize, and renders a single static frame when the
  visitor has `prefers-reduced-motion` set. Tune the traffic with the `density` input.

## API

| Method | Route                        | Purpose                                  |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/api/health`                | Liveness + uptime                        |
| GET    | `/api/company/capabilities`  | Platform capability cards                |
| GET    | `/api/company/metrics`       | Hero metric strip                        |
| GET    | `/api/company/milestones`    | "How it works" steps                     |
| GET    | `/api/company/overview`      | All of the above in one payload          |
| POST   | `/api/contact`               | Contact form (validated, returns a ref)  |

Content is served from `backend/src/company/company.service.ts` — swap that for a CMS or
database later without touching the controller or the Angular client. Contact enquiries are
held in memory in `contact.service.ts`; point it at a repository or CRM when you are ready.

The front end keeps a local copy of the content (`frontend/src/app/core/api.ts`) and falls
back to it if the API is unreachable, so the site never renders empty.

## Building

```powershell
npm run build
```

Frontend output lands in `frontend/dist/frontend`, backend in `backend/dist`. The production
Angular build swaps in `src/environments/environment.production.ts` — set `apiUrl` there to
wherever the API is deployed.

## Deployment

Two Vercel projects in the `gu1` team, each built from its own directory so Vercel's
framework detection applies cleanly:

| Project        | Root directory | Framework | URL                                |
| -------------- | -------------- | --------- | ---------------------------------- |
| `deepsurg`     | `frontend/`    | Angular   | https://deepsurg.vercel.app        |
| `deepsurg-api` | `backend/`     | NestJS    | https://deepsurg-api.vercel.app    |

`frontend/vercel.json` rewrites `/api/*` to the API deployment, so the browser keeps talking
to a single origin — `environment.production.ts` stays on the relative `/api`, and the API
needs no CORS allowlist.

Both projects deploy from this repo on a push to `main`. Each skips its build when nothing
in its own directory changed (`git diff --quiet HEAD^ HEAD .` as the ignored build step), so
a front-end commit does not redeploy the API.

Enquiries posted to `/api/contact` are still held in memory, which on serverless means they
are logged and then lost — wire `contact.service.ts` to email or a database before relying
on the form.
