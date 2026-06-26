# Superteam / TxLINE Challenge Submission

## Project

**Global Football Betting Intelligence Dashboard**

An end-to-end World Cup betting intelligence dashboard powered by TxLINE live odds. It helps analysts monitor football markets, compare odds, calculate implied probability, expected value, ROI, risk exposure, Kelly stake sizing, and responsible-gaming limits.

This is an analytical tool only. It does not place bets, automate gambling, scrape bookmakers, or guarantee profits.

## Links

- GitHub repo: `https://github.com/Franciscoarancibia34/global-football-betting-dashboard`
- Live demo: `TODO: paste deployment URL if available`
- Demo video or screenshots: `TODO: paste link if required`

## What I Built

I built a full-stack dashboard that connects to TxLINE/TxODDS and transforms live World Cup odds into a decision-support interface:

- Live odds table with market, bookmaker, selection, odds, normalized probability, and EV.
- TxLINE provider integration with fallback provider architecture.
- Radar panel to compare market reference odds with a manually entered bookmaker quote.
- Risk Lab for EV, expected ROI, Kelly stake sizing, exposure, and best/worst-case outcomes.
- Responsible-gaming module with exposure limits and a visible legal disclaimer.
- Alerts panel for value opportunities and odds movement.
- Portfolio API with responsible limits and CSV export.
- Docker-ready Next.js app with PostgreSQL, Prisma, Redis-ready cache layer, Socket.IO realtime, Vitest, and Playwright.

## Why It Matters

World Cup markets move quickly and are spread across many bookmakers and market types. A user looking at a single sportsbook lacks context: they do not know whether a price is fair, stale, overexposed, or meaningfully different from the wider market.

This dashboard centralizes that workflow:

1. Ingest live TxLINE odds.
2. Normalize probabilities and bookmaker margin.
3. Surface markets worth reviewing.
4. Require manual confirmation before any betting action.
5. Keep risk and responsible-gaming constraints visible at all times.

## TxLINE Integration

The app includes a dedicated setup flow at `/txline-setup` to activate the World Cup free tier:

- Connect Phantom.
- Register the free TxLINE subscription on Solana.
- Activate API credentials through TxLINE.
- Store `TXLINE_SESSION_JWT` and `TXLINE_API_TOKEN` locally in `.env.local`.

Provider selection is automatic:

1. TxLINE when `TXLINE_SESSION_JWT` and `TXLINE_API_TOKEN` exist.
2. The Odds API when `THE_ODDS_API_KEY` exists.
3. MockGlobalOdds fallback when no external provider is configured.

## Technical Highlights

- **Frontend:** Next.js 14 App Router, TypeScript, TailwindCSS, shadcn-style UI primitives, Recharts.
- **Backend:** Next.js API routes, TypeScript, Zod validation, rate limiting.
- **Data:** PostgreSQL + Prisma schema for users, bookmakers, leagues, teams, matches, markets, odds snapshots, bets, bankroll events, alerts, model probabilities, and risk metrics.
- **Realtime:** Socket.IO live update channel.
- **Provider Architecture:** `OddsProvider` interface with `fetchLeagues`, `fetchFixtures`, `fetchOdds`, and `subscribeLiveOdds`.
- **Resilience:** API fallbacks for slow DB responses, CSV export fallback, mock odds fallback if external providers fail.
- **Testing:** Vitest unit tests and Playwright smoke test.

## Validation

Local stress test results after TxLINE activation:

```text
/                      200
/api/odds/live         200
/api/overview          200
/api/alerts            200
/api/bets              200
/api/export/bets       200
```

TxLINE status:

```json
{
  "provider": "TxLINE",
  "status": "LIVE"
}
```

Tests:

```text
Vitest: 5 passed
Playwright smoke: 1 passed
TypeScript: no errors
```

## Responsible Use

The application includes a visible disclaimer:

> Herramienta informativa/analitica. No garantiza ganancias.

It does not automate betting execution. Users must manually evaluate opportunities and stay within responsible exposure limits.

## Known Limitations

- Current public demo should not include private TxLINE tokens.
- TxLINE market names and price formats may require provider-specific refinement as the API evolves.
- The first version uses a simple probability/EV model; ML probability models can be plugged in through `model_probabilities`.
- The realtime engine currently has a mock Socket.IO stream; TxLINE polling is used for the live API route.

## Roadmap

- Historical odds replay and backtesting.
- Telegram/Discord alert webhooks.
- Model probability plug-ins using ELO, xG, injuries, rest, and closing-line value.
- Multi-bookmaker arbitrage scanner.
- Team/league filters optimized for World Cup workflows.
- Hosted demo with secrets managed through deployment environment variables.
