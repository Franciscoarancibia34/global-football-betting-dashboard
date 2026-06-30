# Deployment Notes

## Recommended Public MVP Path

Use Vercel connected to this GitHub repository:

`https://github.com/Franciscoarancibia34/global-football-betting-dashboard`

Recommended settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: default

## Environment Variables

For a safe public demo, deploy without private TxLINE credentials first. The app will use its mock/fallback provider and still show the product flow.

Minimum public demo env:

```bash
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=https://YOUR-VERCEL-APP.vercel.app
PUBLIC_DEMO_MODE=true
ODDS_PROVIDER=mock
```

Optional TxLINE env, only if you want the hosted demo to use live TxLINE data:

```bash
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_SESSION_JWT=...
TXLINE_API_TOKEN=...
TXLINE_COMPETITION_ID=
TXLINE_MAX_FIXTURES=12
```

Do not paste these values in GitHub files, screenshots, public forms, or README text. Use Vercel encrypted environment variables only.

## Public Routes To Verify

After deploy, verify:

- `/` - Trading Tools and Agents dashboard
- `/pulse` - Consumer and Fan Experiences
- `/settlement` - Prediction Markets and Settlement
- `/api/odds/live` - provider status and odds payload

## Current Local Build Note

Local `prisma generate` succeeds. `next build` started but became very slow in the local sandbox environment. Vercel should run the build in its own environment; if it fails there, inspect the Vercel logs and fix the reported route/module issue.

## Submission Safety

The public demo must not:

- Move funds.
- Place bets.
- Trigger wallet transactions.
- Expose TxLINE tokens.
- Promise profit.

The repo already includes disclaimers and responsible-use copy.
