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

| Method | Route           | Purpose                                 |
| ------ | --------------- | --------------------------------------- |
| GET    | `/api/health`   | Liveness + uptime                       |
| POST   | `/api/contact`  | Contact form (validated, returns a ref) |

Page content is authored in the Angular components, so the contact form is the only thing
that needs the server.

A submitted form is emailed straight out — nothing is stored, because the API runs as a
serverless function and anything held in memory disappears with the instance. The inbox is
the record. `contact/mail.service.ts` posts to Resend over HTTPS (no SMTP connection to keep
alive, no extra dependency) and reads three variables:

| Variable         | Default                        | Notes                                    |
| ---------------- | ------------------------------ | ---------------------------------------- |
| `RESEND_API_KEY` | —                              | Required. https://resend.com/api-keys    |
| `CONTACT_TO`     | `omar@deepsurg.ai`             | Where enquiries land                     |
| `CONTACT_FROM`   | `DeepSurg <onboarding@resend.dev>` | Must be a sender Resend has verified |

Without a key the endpoint answers `503` and the form tells the visitor to email us
directly. That is deliberate: better a visible failure than accepting an enquiry nobody
will ever read.

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

`deepsurg-api` needs `RESEND_API_KEY` set in its Vercel environment variables (see the API
section above) before the contact form can deliver anything.
