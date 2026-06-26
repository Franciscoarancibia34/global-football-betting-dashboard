import type { Server } from "socket.io";
import { approximateRuinProbability } from "@/app/lib/analytics/betting";
import { createMockOddsProvider } from "@/app/lib/providers/mock-odds-provider";
import type { DashboardAlert, DashboardKpis, LiveOdd } from "@/app/lib/types/domain";
import { logger } from "@/app/lib/server/logger";

function buildAlerts(odds: LiveOdd[]): DashboardAlert[] {
  const value = odds
    .filter((odd) => odd.ev > 0.08)
    .slice(0, 4)
    .map((odd) => ({
      id: `value-${odd.id}`,
      type: "VALUE_BET" as const,
      severity: odd.ev > 0.14 ? ("CRITICAL" as const) : ("WARNING" as const),
      title: `Value detectado: ${odd.selection}`,
      message: `${odd.homeTeam} vs ${odd.awayTeam} en ${odd.bookmaker}: EV ${(odd.ev * 100).toFixed(1)}%.`,
      createdAt: odd.timestamp
    }));

  const moves = odds
    .filter((odd) => Math.abs(odd.changePct) > 0.05)
    .slice(0, 3)
    .map((odd) => ({
      id: `move-${odd.id}`,
      type: "ODDS_MOVE" as const,
      severity: "INFO" as const,
      title: "Movimiento brusco de cuota",
      message: `${odd.bookmaker} movio ${odd.selection} ${(odd.changePct * 100).toFixed(1)}% en ${odd.market}.`,
      createdAt: odd.timestamp
    }));

  return [...value, ...moves].slice(0, 6);
}

function buildKpis(odds: LiveOdd[]): DashboardKpis {
  const topEdges = odds.filter((odd) => odd.ev > 0).slice(0, 12);
  const totalExposure = 182.5;
  const expectedRoi = topEdges.length
    ? topEdges.reduce((sum, odd) => sum + odd.expectedRoi, 0) / topEdges.length
    : 0;
  const aggregateRisk = approximateRuinProbability({
    bankroll: 1250,
    totalExposure,
    edge: expectedRoi,
    volatility: 0.11
  });

  return {
    bankroll: 1250.35,
    pnlDaily: 18.8,
    pnlWeekly: 74.15,
    pnlMonthly: 212.4,
    realizedRoi: 0.071,
    expectedRoi,
    aggregateRisk,
    totalExposure,
    activeBets: 8
  };
}

export function createLiveOddsEngine(io: Server) {
  const provider = createMockOddsProvider();
  let unsubscribe: (() => void) | undefined;

  return {
    start() {
      unsubscribe?.();
      unsubscribe = provider.subscribeLiveOdds((odds) => {
        const payload = {
          status: "LIVE",
          provider: provider.name,
          odds,
          kpis: buildKpis(odds),
          alerts: buildAlerts(odds),
          at: new Date().toISOString()
        };
        io.emit("odds:update", payload);
      });
      logger.info({ provider: provider.name }, "live odds engine started");
    },
    stop() {
      unsubscribe?.();
    }
  };
}
