# Route Ops

A flight-operations dashboard for a Nigerian airline's domestic network — the kind of screen a dispatcher would keep open. It shows which routes are flying, how full the planes are, whether flights leave on time, and what that earns.

<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/react-19-12b39a.svg?mode=dark"><img alt="React 19" src="https://shieldcn.dev/badge/react-19-12b39a.svg?mode=light"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/typescript-5-12b39a.svg?mode=dark"><img alt="TypeScript" src="https://shieldcn.dev/badge/typescript-5-12b39a.svg?mode=light"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/demo-data-e3b23c.svg?mode=dark"><img alt="Demo data" src="https://shieldcn.dev/badge/demo-data-e3b23c.svg?mode=light"></picture>
</p>

**Demo data, not affiliated with Ibom Air.** Every number is generated for demonstration.

## What's on the screen

- **A route map** — eight Nigerian cities as dots, the flight routes between them as lines. Thicker line = more flights per week. Click a route to focus the whole dashboard on it.
- **Five headline numbers** — on-time performance, how full the planes are, flights flown, revenue, passengers — each with its change against last month and a plain-English definition underneath.
- **A revenue chart** — month by month, with an option to overlay the previous period for comparison.
- **A load-factor chart** — every route side by side against the network average, so underperforming routes stand out.

Everything responds to the filters in the header (time window, comparison mode, selected route). It also works on a phone.

## Run it

```bash
npm install
npm run dev
```

Then open the URL it prints. `npm run build` produces the production bundle.

## What's inside

- `src/lib/mock/` — the fake data and the one place a real API would be swapped in
- `src/store/` — filters and the derived numbers the whole page reads
- `src/components/` — map, KPI cards, charts
- `scripts/` — small checks that verify the numbers stay consistent (`npx tsx scripts/check-consistency.ts`)
