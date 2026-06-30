# Prediction Market Settlement Watch Submission

## Project Title

Prediction Market Settlement Watch

## Briefly Explain Your Project

Prediction Market Settlement Watch is a TxLINE-powered verification layer for World Cup prediction markets. It does not settle markets or move funds. Instead, it helps operators, analysts, or AI agents decide which markets look ready, which need monitoring, and which should be manually reviewed before any settlement or payout flow.

The product groups TxLINE live odds by match and market, then computes:

- Market completeness by number of available selections.
- Reference odds across the market.
- Strongest odds movement.
- Settlement confidence.
- Review flags: Ready, Watch, or Review.

This creates a practical bridge between live odds data and prediction-market operations: before resolving a market, the system highlights whether the market state looks stable or suspicious.

## Link to Live and Working MVP

Use the deployed URL if available. For local demo:

`http://127.0.0.1:3003/settlement`

## Live Demo Video

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard/blob/main/videos/prediction-market-settlement-demo.webm`

## Public Repository

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard`

## Technical Documentation

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard/blob/main/README.md`

## X Profile or Post

Optional. If sharing publicly, use:

`Built Prediction Market Settlement Watch: a TxLINE-powered verification layer that flags World Cup markets as Ready, Watch, or Review before settlement.`

## Team Experience Using TxLINE API

TxLINE worked well as a normalized reference layer for market verification. The same feed used by the analytical dashboard can also power settlement-readiness checks, which is valuable because prediction markets need clear, explainable data before resolution.

The most useful part was being able to derive product-level signals from odds movement: confidence, completeness, and discrepancy review. These signals are more useful for settlement workflows than raw odds alone.

The main friction was the activation flow and making sure credentials are handled safely. The project addresses this with a local `/txline-setup` page, `.env.local` credential handling, fallback providers, and explicit warnings that the app does not request seed phrases or private keys.

## Anything Else

This is intentionally a verification and readiness layer. It does not settle markets, authorize payouts, transfer assets, or guarantee outcomes. Any market marked for review should still require human or governance approval before settlement.
