import { NextResponse } from "next/server";
import { createMockOddsProvider } from "@/app/lib/providers/mock-odds-provider";
import { getDemoUser } from "@/app/lib/server/demo-user";
import { prisma } from "@/app/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let persisted: Array<{ id: string; type: string; severity: string; title: string; message: string; createdAt: Date }> = [];
  try {
    const user = await getDemoUser();
    persisted = await prisma.alert.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 8
    });
  } catch {
    persisted = [];
  }
  const odds = await createMockOddsProvider().fetchOdds();
  const generated = odds
    .filter((odd) => odd.ev > 0.08 || Math.abs(odd.changePct) > 0.05)
    .slice(0, 6)
    .map((odd) => ({
      id: odd.id,
      type: odd.ev > 0.08 ? "VALUE_BET" : "ODDS_MOVE",
      severity: odd.ev > 0.14 ? "CRITICAL" : "WARNING",
      title: odd.ev > 0.08 ? "Value bet detectada" : "Movimiento brusco",
      message: `${odd.homeTeam} vs ${odd.awayTeam} / ${odd.selection} en ${odd.bookmaker}.`,
      createdAt: odd.timestamp
    }));

  return NextResponse.json({ alerts: [...generated, ...persisted] });
}
