# World Cup Live Pulse Submission

## Project Title

World Cup Live Pulse

## Briefly Explain Your Project

World Cup Live Pulse is a fan-facing World Cup experience powered by TxLINE live odds. It turns real-time odds movement into a simple match pulseboard: fans can see which matches are heating up, what market momentum changed, and why a match deserves attention, without needing to understand trading terminology.

The project reuses the same TxLINE integration from the Global Football Betting Intelligence Dashboard, but presents the data as a consumer product instead of an analyst terminal. It is designed for people watching the World Cup who want a fast, readable, responsible explanation of the market story behind each match.

## Link to Live and Working MVP

Use the deployed URL if available. For local demo:

`http://127.0.0.1:3003/pulse`

## Live Demo Video

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard/blob/main/videos/world-cup-live-pulse-demo.webm`

## Public Repository

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard`

## Technical Documentation

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard/blob/main/README.md`

## X Profile or Post

Optional. If sharing publicly, use a short post like:

`Built World Cup Live Pulse, a TxLINE-powered fan layer that turns live World Cup odds into match momentum, hot-game rankings, and plain-language market stories.`

## Team Experience Using TxLINE API

TxLINE was most useful because it gave the project a normalized source of live World Cup odds that could power multiple products from the same data layer. The same provider abstraction supports an analyst dashboard, an agent signal panel, and now a consumer-facing pulseboard.

The best part was being able to transform odds movement into higher-level product signals: hot matches, market shifts, EV pressure, and explainable rankings.

The main friction was the activation flow. The free tier requires a Solana wallet transaction, so the app includes a dedicated `/txline-setup` flow, clear safety warnings, custom RPC support, and a fallback path for cases where the transaction confirms but the API token activation step needs to be completed manually.

## Anything Else

This is an informational fan experience. It does not place bets, automate betting, or guarantee profits. The product is designed to make live World Cup market movement easier to understand while keeping responsible-use messaging visible.
