import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.APP_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const leagues = [
  ["World Cup Group B", "FIFA", "Switzerland", "Canada", "PRE", null],
  ["World Cup Group C", "FIFA", "Scotland", "Brazil", "PRE", null],
  ["World Cup Group B", "FIFA", "Bosnia and Herzegovina", "Qatar", "PRE", null],
  ["World Cup Group A", "FIFA", "Czechia", "Mexico", "PRE", null],
  ["World Cup Group A", "FIFA", "South Africa", "Korea Republic", "PRE", null],
  ["World Cup Group C", "FIFA", "Morocco", "Haiti", "PRE", null],
  ["World Cup Group E", "FIFA", "Ecuador", "Germany", "PRE", null],
  ["World Cup Group D", "FIFA", "United States", "Turkey", "PRE", null]
];
const bookmakers = ["Pinnacle", "Bet365", "Betano", "Coolbet"];
const markets = [
  ["1X2", "Match Winner", ["Home", "Draw", "Away"]],
  ["OU25", "Over/Under 2.5", ["Over 2.5", "Under 2.5"]],
  ["BTTS", "Both Teams To Score", ["Yes", "No"]],
  ["AH", "Asian Handicap", ["Home -0.5", "Away +0.5"]]
];
let tick = 0;

function impliedProbability(decimalOdds) {
  return decimalOdds <= 1 ? 0 : 1 / decimalOdds;
}

function oddsFor(seed, low, high) {
  return Number((low + (seed % 100) * ((high - low) / 100)).toFixed(2));
}

function buildOdds() {
  tick += 1;
  const now = new Date().toISOString();
  const rows = [];
  leagues.forEach(([league, country, homeTeam, awayTeam, status, minute], matchIndex) => {
    markets.forEach(([marketCode, market, selections]) => {
      bookmakers.forEach((bookmaker, bookmakerIndex) => {
        selections.forEach((selection, selectionIndex) => {
          const seed = `${league}${marketCode}${selection}${bookmaker}`.length + matchIndex * 13 + bookmakerIndex * 7 + selectionIndex * 11;
          const opening = oddsFor(seed, marketCode === "1X2" ? 1.75 : 1.72, marketCode === "1X2" ? 4.8 : 2.25);
          const wave = Math.sin((tick + seed) / 4) * 0.045;
          const shock = tick % 9 === 0 && selectionIndex === 0 && bookmaker === "Pinnacle" ? 0.09 : 0;
          const decimalOdds = Number(Math.min(8.5, Math.max(1.2, opening * (1 + wave + shock))).toFixed(2));
          const previousDecimalOdds = Number(Math.min(8.5, Math.max(1.2, opening * (1 + wave * 0.55))).toFixed(2));
          const implied = impliedProbability(decimalOdds);
          const fairProbability = Math.min(0.78, Math.max(0.08, implied + (selectionIndex === 0 ? 0.04 : -0.015)));
          const ev = fairProbability * decimalOdds - 1;
          rows.push({
            id: `${matchIndex}-${marketCode}-${bookmaker}-${selection}-${tick}`,
            matchId: `match-${matchIndex + 1}`,
            country,
            league,
            kickoffTime: new Date(Date.now() + (matchIndex + 1) * 45 * 60_000).toISOString(),
            status,
            minute: minute ?? undefined,
            homeTeam,
            awayTeam,
            market,
            marketCode,
            selection,
            bookmaker,
            decimalOdds,
            openingDecimalOdds: opening,
            previousDecimalOdds,
            impliedProbability: implied,
            normalizedProbability: implied / 1.06,
            fairProbability,
            ev,
            expectedRoi: ev,
            changePct: (decimalOdds - previousDecimalOdds) / previousDecimalOdds,
            timestamp: now
          });
        });
      });
    });
  });
  return rows;
}

function buildAlerts(odds) {
  return odds
    .filter((odd) => odd.ev > 0.08 || Math.abs(odd.changePct) > 0.05)
    .slice(0, 6)
    .map((odd) => ({
      id: `alert-${odd.id}`,
      type: odd.ev > 0.08 ? "VALUE_BET" : "ODDS_MOVE",
      severity: odd.ev > 0.14 ? "CRITICAL" : "WARNING",
      title: odd.ev > 0.08 ? `Value detectado: ${odd.selection}` : "Movimiento brusco de cuota",
      message: `${odd.homeTeam} vs ${odd.awayTeam} en ${odd.bookmaker}: EV ${(odd.ev * 100).toFixed(1)}%.`,
      createdAt: odd.timestamp
    }));
}

function buildKpis(odds) {
  const topEdges = odds.filter((odd) => odd.ev > 0).slice(0, 12);
  const expectedRoi = topEdges.reduce((sum, odd) => sum + odd.ev, 0) / Math.max(1, topEdges.length);
  return {
    bankroll: 1250.35,
    pnlDaily: 18.8,
    pnlWeekly: 74.15,
    pnlMonthly: 212.4,
    realizedRoi: 0.071,
    expectedRoi,
    aggregateRisk: 0.18,
    totalExposure: 182.5,
    activeBets: 8
  };
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    await handle(req, res);
  });
  const io = new Server(httpServer, { path: "/api/socket", cors: { origin: "*" } });

  setInterval(() => {
    const odds = buildOdds();
    io.emit("odds:update", {
      status: "LIVE",
      provider: "MockGlobalOdds",
      odds,
      kpis: buildKpis(odds),
      alerts: buildAlerts(odds),
      at: new Date().toISOString()
    });
  }, 3000);

  io.on("connection", (socket) => {
    const odds = buildOdds();
    socket.emit("connection-status", { status: "LIVE", at: new Date().toISOString() });
    socket.emit("odds:update", {
      status: "LIVE",
      provider: "MockGlobalOdds",
      odds,
      kpis: buildKpis(odds),
      alerts: buildAlerts(odds),
      at: new Date().toISOString()
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Global Football Betting Intelligence Dashboard ready on http://localhost:${port}`);
  });
});
