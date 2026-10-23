# ထွယ်ဂျီဂွမ်Caculator — Web / PWA

Web severance calculator for E-9 workers in South Korea, available in English and Burmese with an installable PWA shell and bundled Myanmar fonts. It estimates Normal statutory severance, DB baselines, and DC required contributions in gross KRW before tax.

## Using the calculator

1. Choose a language and retirement scheme.
2. Enter employment details and complete the special-case questions.
3. Enter actual wages for the displayed periods, review, and calculate.
4. Read the estimate, eligibility explanation, breakdown, assumptions, and official sources.

**Try an example** fills the official MOEL reference scenario so you can explore the flow. Calculations need a connection to the API. No account is required.

## Development

Use Node.js 24. Start a compatible API on port 3001, then:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. By default Vite proxies `/api` to port 3001. To use another API, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`. Never put secrets in a `VITE_` variable.

## Checks and production build

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

For browser integration tests, run the API separately:

```sh
npm exec -- playwright install chromium
npm run test:e2e
```

The browser suite covers desktop and phone-sized layouts, real API calculations, Burmese, and retry after a failed request. Test fixtures contain fictional/public example data.

For deployment, set `VITE_API_BASE_URL` to the HTTPS API origin **before building**, or configure a same-origin `/api` reverse proxy. Serve `dist/` over HTTPS. Configure the API to allow the web origin. Hosting is not provisioned here.

## Contract and PWA

The pinned API contract lives in `contract/openapi.json`. Replace it only with an intentionally selected API release artifact, then run:

```sh
npm run contract:generate
npm run typecheck
```

Generated types live in `src/api/schema.d.ts`.

Production builds cache app assets and explanatory guides for offline use. Financial requests and responses are not cached. Calculations need a connection. Salary data is held in memory; only `e9-language` is stored. Service-worker updates require an explicit reload so active entries are not silently discarded.
