import { NextRequest, NextResponse } from "next/server";
import { createBetSchema } from "@/app/lib/server/validators";
import { getDemoUser } from "@/app/lib/server/demo-user";
import { prisma } from "@/app/lib/server/db";
import { rateLimit } from "@/app/lib/server/rate-limit";

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
  try {
    const user = await withTimeout(getDemoUser());
    const bets = await withTimeout(prisma.bet.findMany({
      where: { userId: user.id },
      include: { match: { include: { league: true, homeTeam: true, awayTeam: true } }, market: true, bookmaker: true },
      orderBy: { createdAt: "desc" },
      take: 50
    }));
    return NextResponse.json({ bets });
  } catch {
    return NextResponse.json({ bets: [] });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`bets:${ip}`, 30).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const parsed = createBetSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await getDemoUser();
  const stake = parsed.data.stake;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const placedToday = await prisma.bet.aggregate({
    where: { userId: user.id, createdAt: { gte: today } },
    _sum: { stake: true }
  });
  const dailyUsed = Number(placedToday._sum.stake ?? 0);

  if (stake > Number(user.maxBetStake)) {
    return NextResponse.json({ error: `Stake exceeds per-bet limit of ${user.maxBetStake} USDC` }, { status: 400 });
  }
  if (dailyUsed + stake > Number(user.dailyStakeLimit)) {
    return NextResponse.json({ error: "Daily responsible-gaming exposure limit exceeded" }, { status: 400 });
  }

  const bet = await prisma.bet.create({
    data: {
      userId: user.id,
      matchId: parsed.data.matchId,
      marketId: parsed.data.marketId,
      bookmakerId: parsed.data.bookmakerId,
      selection: parsed.data.selection,
      decimalOdds: parsed.data.decimalOdds,
      stake,
      strategy: parsed.data.strategy,
      notes: parsed.data.notes
    }
  });
  return NextResponse.json({ bet }, { status: 201 });
}
