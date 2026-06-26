import { NextResponse } from "next/server";
import { getDemoUser } from "@/app/lib/server/demo-user";
import { prisma } from "@/app/lib/server/db";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Database timeout")), ms);
    })
  ]);
}

export async function GET() {
  let bets: Array<{
    placedAt: Date;
    match: { league: { name: string }; homeTeam: { name: string }; awayTeam: { name: string } };
    market: { code: string };
    bookmaker: { name: string };
    selection: string;
    decimalOdds: unknown;
    stake: unknown;
    status: string;
    profit: unknown | null;
  }> = [];

  try {
    const user = await withTimeout(getDemoUser());
    bets = await withTimeout(prisma.bet.findMany({
      where: { userId: user.id },
      include: { match: { include: { league: true, homeTeam: true, awayTeam: true } }, market: true, bookmaker: true },
      orderBy: { createdAt: "desc" }
    }));
  } catch {
    bets = [];
  }

  const rows = [
    ["placed_at", "league", "match", "market", "selection", "bookmaker", "odds", "stake", "status", "profit"],
    ...bets.map((bet) => [
      bet.placedAt.toISOString(),
      bet.match.league.name,
      `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name}`,
      bet.market.code,
      bet.selection,
      bet.bookmaker.name,
      String(bet.decimalOdds),
      String(bet.stake),
      bet.status,
      bet.profit == null ? "" : String(bet.profit)
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=bets.csv"
    }
  });
}
