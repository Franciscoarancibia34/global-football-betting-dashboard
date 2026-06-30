# Global Football Betting Intelligence Dashboard

Full-stack dashboard para monitorear cuotas de futbol mundial, calcular probabilidad implicita, EV, ROI esperado, riesgo, alertas y exposicion de portfolio en tiempo real.

> Herramienta informativa/analitica. No garantiza ganancias. Usa limites de exposicion y pausas de juego responsable.

## Stack

- Next.js 14 App Router + TypeScript
- TailwindCSS + componentes estilo shadcn/ui
- Recharts
- Next.js API routes
- PostgreSQL + Prisma ORM
- Redis-ready para cache de cuotas vivas
- Socket.IO para realtime
- NextAuth con login por credenciales demo
- Vitest + Playwright
- Docker + docker-compose

## Inicio rapido con Docker

```bash
docker-compose up --build
```

Luego abre [http://localhost:3000](http://localhost:3000).

El compose levanta:

- `app`: Next.js + Socket.IO
- `postgres`: base `football_intel`
- `redis`: cache/colas

Durante el arranque se ejecuta `prisma db push` y `prisma db seed` para crear datos demo.

## Demo local TxLINE LIVE

Para revisar el dashboard con TxLINE ya activado en una maquina local:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), o el puerto indicado por `PORT`.

Si usas un puerto alternativo:

```bash
PORT=3003 npm run dev
```

Validacion rapida:

```bash
curl http://127.0.0.1:3003/api/odds/live
```

La respuesta debe incluir:

```json
{
  "provider": "TxLINE",
  "status": "LIVE"
}
```

### Screenshots

Desktop:

![TxLINE live desktop dashboard](screenshots/dashboard-txline-live-desktop.png)

Mobile:

![TxLINE live mobile dashboard](screenshots/dashboard-txline-live-mobile.png)

### Demo Video

[Watch the TxLINE dashboard demo](txline-dashboard-demo.webm)

## Desarrollo local

```bash
npm install
cp .env.example .env
npx prisma db push
npm run prisma:seed
npm run dev
```

Credenciales demo:

- Email: `demo@football-intel.local`
- Password: `demo1234`

La app no exige login para el dashboard demo; NextAuth queda preparado para proteger rutas cuando se conecte a usuarios reales.

## Variables de entorno

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/football_intel?schema=public
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-secret
LOG_LEVEL=info
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_SESSION_JWT=
TXLINE_API_TOKEN=
TXLINE_COMPETITION_ID=
TXLINE_MAX_FIXTURES=12
THE_ODDS_API_KEY=
THE_ODDS_SPORT_KEY=soccer_fifa_world_cup
THE_ODDS_REGIONS=us,uk,eu,au
THE_ODDS_MARKETS=h2h
```

No hay secretos hardcodeados. Para produccion, cambia `NEXTAUTH_SECRET`, credenciales de DB y cualquier token de proveedor.

Importante: `TXLINE_SESSION_JWT` y `TXLINE_API_TOKEN` son credenciales privadas. Guardalas solo en `.env.local` o en variables del proveedor de deploy. Nunca las subas al repositorio.

## Arquitectura

```text
app/
  api/                 API routes: odds, overview, bets, alerts, risk, export, auth
  components/ui/       Primitivas visuales estilo shadcn
  lib/
    analytics/         EV, ROI, Kelly, overround, drawdown, riesgo
    providers/         OddsProvider + MockGlobalOdds + TheOddsAPI + TxLINE
    realtime/          Socket.IO live engine
    server/            Prisma, Redis, rate limit, validadores
prisma/
  schema.prisma        Modelo de datos principal
  seed.ts              Datos realistas demo
tests/
  unit/                Vitest analytics
  e2e/                 Playwright smoke
```

## Modelo de datos

Tablas incluidas:

- `users`
- `bookmakers`
- `leagues`
- `teams`
- `matches`
- `markets`
- `odds_snapshots`
- `bets`
- `bankroll_events`
- `alerts`
- `model_probabilities`
- `risk_metrics`

Indices claves:

- `odds_snapshots(match_id, market_id, bookmaker_id, timestamp)`
- `matches(league_id, kickoff_time)`
- `bets(user_id, created_at)`
- `alerts(user_id, created_at)`

## OddsProvider

La integracion de datos esta abstraida con:

```ts
fetchLeagues()
fetchFixtures()
fetchOdds()
subscribeLiveOdds()
```

El proveedor `MockGlobalOdds` simula fixtures, mercados y movimientos de cuota cada 2-5 segundos. La app tambien incluye conectores para The Odds API y TxLINE/TxODDS.

Seleccion de proveedor:

1. `TxLINE`, si existen `TXLINE_SESSION_JWT` y `TXLINE_API_TOKEN`.
2. `TheOddsAPI`, si existe `THE_ODDS_API_KEY`.
3. `MockGlobalOdds`, si no hay credenciales externas.

Esto permite trabajar sin bloquear el desarrollo y pasar a datos reales cuando haya token.

### TxLINE / TxODDS World Cup Hackathon

La app esta preparada para el hackathon World Cup de TxODDS en Superteam Earn. El track mas alineado es `Trading Tools and Agents`, porque el producto monitorea odds, detecta senales y calcula riesgo/stake de forma programatica. La vista `TxLINE Agent Signal` convierte el feed en una senal explicable basada en movimiento de cuota, EV y confianza.

Tambien incluye una segunda experiencia candidata para el track `Consumer and Fan Experiences`: [World Cup Live Pulse](/pulse). Esta vista transforma el mismo feed TxLINE en una interfaz para fans, con ranking de partidos calientes, narrativas en lenguaje simple, momentum de mercado y explicaciones responsables sin ejecutar apuestas.

Para el track `Prediction Markets and Settlement`, la ruta [Prediction Market Settlement Watch](/settlement) reutiliza TxLINE como capa de verificacion: cola de mercados, flags de revision, confianza de settlement y deteccion de movimientos bruscos antes de cualquier resolucion.

Flujo para activar datos TxLINE:

1. Entrar a la documentacion de TxLINE World Cup Free Tier.
2. Suscribirse al tier gratuito con wallet Solana. No requiere pago, pero si requiere una transaccion on-chain de registro.
3. Activar el acceso y obtener `TXLINE_SESSION_JWT` y `TXLINE_API_TOKEN`.
4. Guardar esos valores en `.env`.
5. Reiniciar el servidor. El badge del dashboard debe mostrar `TxLINE`.

Endpoints TxLINE preparados:

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`

Supuesto tecnico: TxLINE documenta `Prices` como enteros; el conector normaliza valores mayores a `100` como decimal odds escaladas por `1000`. Si el proveedor confirma otra escala, ajustar `normalizePrice()` en `app/lib/providers/txline-provider.ts`.

Submission sugerida para Superteam:

- Repo publico del proyecto.
- Web desplegada o demo local grabada.
- Demo de hasta 5 minutos mostrando ingestion TxLINE o modo replay/mock compatible, tabla live, radar de movimientos, EV/stake/riesgo y alertas.
- Documentacion tecnica breve con endpoints usados y feedback de la API.

Este repositorio incluye `SUBMISSION.md` con un texto listo para adaptar al formulario de Superteam.

Para el track de experiencia de consumidor, este repositorio incluye `PULSE_SUBMISSION.md` con un texto separado para presentar `World Cup Live Pulse`.

Para el track de prediction markets, este repositorio incluye `SETTLEMENT_SUBMISSION.md` con un texto separado para presentar `Prediction Market Settlement Watch`.

Videos adicionales:

- [World Cup Live Pulse demo](videos/world-cup-live-pulse-demo.webm)
- [Prediction Market Settlement Watch demo](videos/prediction-market-settlement-demo.webm)

Para publicar un MVP accesible por los jueces, ver `DEPLOYMENT.md`. Para copiar campos a Superteam, ver `SUBMISSION_LINKS.md`.

### The Odds API

Si defines `THE_ODDS_API_KEY`, el endpoint `/api/odds/live` cambia automaticamente de `MockGlobalOdds` a `TheOddsAPI`.

Flujo recomendado para Betano:

1. El dashboard trae cuotas de mercado desde The Odds API.
2. El panel `Radar mercado a Betano` muestra el promedio de mercado.
3. Tu pegas manualmente la cuota que ves en Betano.
4. El dashboard calcula mejora vs mercado, break-even, EV, ROI y Kelly 1/4.
5. La apuesta solo se ejecuta manualmente en Betano si la cuota sigue disponible y el stake es responsable.

No se automatiza login, scraping ni apuestas en Betano.

## Funcionalidades implementadas

- Overview con KPIs: bankroll, PnL, ROI esperado, riesgo, exposicion, apuestas activas.
- Graficos: bankroll/PnL, drawdown, distribucion por liga, exposicion por horario.
- Live odds table con filtros, odds apertura/actual, variacion, probabilidad normalizada y EV.
- Alertas in-app: value bets y movimientos bruscos.
- Risk Lab: simulador de stake, EV, ROI, Kelly fraccional y exposicion.
- Portfolio API con creacion de apuestas, limites responsables y exportacion CSV.
- Sidebar, modo oscuro/claro y responsive real.
- Legal disclaimer y modulo de juego responsable visibles.
- Radar mercado a Betano: compara promedio de mercado con cuota Betano manual y calcula EV/stake.

## Comandos

```bash
npm run dev          # servidor Next + Socket.IO
npm run build        # prisma generate + next build
npm run start        # produccion con custom server
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest
npm run test:e2e     # Playwright
```

## Verification Snapshot

Ultima validacion local del paquete:

```text
/                      200
/api/odds/live         200
/api/overview          200
/api/alerts            200
/api/bets              200
/api/export/bets       200

Provider: TxLINE
Status: LIVE

TypeScript: no errors
Vitest: 5 tests passed
Playwright smoke: passed
```

Para correr el smoke e2e contra un puerto local especifico:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npx playwright test tests/e2e/smoke.spec.ts --project=chromium
```

## Decisiones tecnicas

- Next API routes se usan para mantener frontend/backend en un solo deploy.
- Socket.IO se monta en un custom server para pushes realtime.
- Prisma usa `db push` en Docker demo para evitar migraciones manuales en el primer arranque.
- Redis queda conectado por env y listo para cache/colas; el mock provider funciona aunque Redis no este disponible.
- La app usa datos demo por defecto para que pueda evaluarse sin proveedor de odds pago.

## Roadmap

- Conector real de odds con SLA y reconciliacion persistente.
- Motor ML de probabilidades justas con ELO, xG, lesiones y fatiga.
- Alertas Telegram/Discord via webhook.
- RBAC completo en UI.
- Backtesting de estrategias.
- PWA movil para monitoreo rapido.
- Auditoria de cambios de odds y replay historico.
