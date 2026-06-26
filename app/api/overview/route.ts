import { NextResponse } from "next/server";
import { maxDrawdown } from "@/app/lib/analytics/betting";
import { createMockOddsProvider } from "@/app/lib/providers/mock-odds-provider";
import { getDemoUser } from "@/app/lib/server/demo-user";
import { prisma } from "@/app/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const odds = await createMockOddsProvider().fetchOdds();
  let user: { id: string; bankroll: unknown } = { id: "demo", bankroll: 1250.35 };
  let bets: Array<{ status: string; profit: unknown; stake: unknown }> = [];
  try {
    user = await getDemoUser();
    bets = await prisma.bet.findMany({
      where: { userId: user.id },
      include: { match: { include: { league: true, homeTeam: true, awayTeam: true } }, market: true, bookmaker: true },
      orderBy: { createdAt: "desc" }
    });
  } catch {
    bets = [{ status: "OPEN", profit: 0, stake: 20 }];
  }

  const activeBets = bets.filter((bet) => bet.status === "OPEN");
  const pnl = bets.reduce((sum, bet) => sum + Number(bet.profit ?? 0), 0);
  const exposure = activeBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
  const topEdges = odds.filter((odd) => odd.ev > 0).slice(0, 12);
  const expectedRoi = topEdges.reduce((sum, odd) => sum + odd.expectedRoi, 0) / Math.max(1, topEdges.length);
  const equity = [1000, 1016, 1008, 1042, 1034, 1088, 1125, Number(user.bankroll)];

  return NextResponse.json({
    kpis: {
      bankroll: Number(user.bankroll),
      pnlDaily: 18.8 + pnl,
      pnlWeekly: 74.15 + pnl,
      pnlMonthly: 212.4 + pnl,
      realizedRoi: 0.071,
      expectedRoi,
      aggregateRisk: 0.18 + exposure / Math.max(1, Number(user.bankroll)) / 2,
      totalExposure: exposure || 182.5,
      activeBets: activeBets.length || 8
    },
    charts: {
      bankroll: equity.map((value, index) => ({ label: `D${index + 1}`, bankroll: value, pnl: value - 1000 })),
      drawdown: equity.map((_, index) => {
        const slice = equity.slice(0, index + 1);
        return { label: `D${index + 1}`, drawdown: maxDrawdown(slice) };
      }),
      distribution: [
        { label: "Premier League", value: 31 },
        { label: "LaLiga", value: 24 },
        { label: "Chile", value: 18 },
        { label: "Brazil", value: 16 },
        { label: "Japan", value: 11 }
      ],
      riskHeatmap: Array.from({ length: 12 }, (_, index) => ({
        label: `${8 + index}:00`,
        risk: Number((0.1 + Math.sin(index / 2) * 0.05 + index / 60).toFixed(3)),
        exposure: 20 + index * 7
      }))
    }
  });
}
