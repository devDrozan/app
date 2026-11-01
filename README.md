# ထွယ်ဂျီဂွမ်Caculator — Web / PWA

Web severance and work-time salary calculator for E-9 workers in South Korea, available in English and Burmese with an installable PWA shell and bundled Myanmar fonts. It estimates Normal statutory severance, DB baselines, and DC required contributions in gross KRW before tax.

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

Production builds cache app assets and explanatory guides for offline use. Financial requests and responses are not cached. Calculations need a connection. Severance inputs and all results stay in session memory. Language and salary-module appearance preferences are stored locally; explicitly saved salary-module work records and monthly pay settings use IndexedDB as described below. Service-worker updates require an explicit reload so active entries are not silently discarded.

## Salary estimates and local work records

Choose **Salary Estimate from Work Time** to enter monthly pay settings and daily normal, overtime, and overlapping night hours. The calendar and date-list alternative work offline. **Save month** stores that month's settings and records in this browser's IndexedDB after acknowledging the storage notice. Unsaved changes remain only in the current page session; save before closing. New months copy the latest earlier settings without changing existing months. Use Delete month or Delete all records to remove saved data. Browser-data clearing also removes these records; no cloud backup or sync is provided.

Calculate submits only the selected month to `POST /v1/salary-estimates` on the configured API. All pay calculations run on the server and require connectivity. Results stay in session memory and disappear when inputs change. Financial requests/responses are never service-worker cached. The normal weekday hourly rate is reference-only: the full monthly base covers those hours. Weekend rates are full rates and night premiums are additional. Estimates exclude tax, insurance, absence/partial-month deductions, public-holiday rules, and automatic statutory rates. This module's local storage does not change the severance calculator's session-only policy.

The module supports English/Burmese, Light/Dark appearance, and explicit save, error, and retry states. Salary appearance is a local preference; the rest of the web calculator retains its existing styling.
