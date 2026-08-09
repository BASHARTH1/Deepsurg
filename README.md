# DeepSurg

Marketing site for DeepSurg, an AI medical company — **Angular 20**, no server of its own.

```
DeepSurg/
└─ frontend/   Angular 20 (standalone components, signals, SCSS)
```

## Running it

```powershell
npm run install:all    # frontend dependencies
npm run dev            # http://localhost:4200
```

If port 4200 is busy: `npm --prefix frontend start -- --port 4300`.

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

## Contact form

The form posts straight to [Web3Forms](https://web3forms.com), which emails the submission
to the address its access key was issued for — so the site needs no backend at all.

Set the key in `frontend/src/environments/environment.production.ts` (and `environment.ts`
for local testing). It belongs in the bundle: an access key only grants "send to that one
inbox", nothing more. Get one by entering the destination address at web3forms.com — no
account required.

With no key set the form refuses to submit and tells the visitor to email us directly,
rather than pretending to have sent something.

## Building

```powershell
npm run build
```

Output lands in `frontend/dist/frontend/browser`. The production build swaps in
`src/environments/environment.production.ts`.

## Deployment

One Vercel project, `deepsurg`, in the `gu1` team — root directory `frontend/`, Angular
preset, live at https://deepsurg.vercel.app. It redeploys from this repo on a push to
`main`, and skips the build when nothing under `frontend/` changed.

`frontend/vercel.json` pins `outputDirectory` to `dist/frontend/browser`; without it the
site is published one level up and every page 404s.
