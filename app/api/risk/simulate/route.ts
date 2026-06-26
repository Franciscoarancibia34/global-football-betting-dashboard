import { NextRequest, NextResponse } from "next/server";
import { expectedValue, expectedRoi, fractionalKellyStake } from "@/app/lib/analytics/betting";
import { simulateRiskSchema } from "@/app/lib/server/validators";

export async function POST(request: NextRequest) {
  const parsed = simulateRiskSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { bankroll, decimalOdds, probability, stake, kellyFraction } = parsed.data;
  const ev = expectedValue(probability, decimalOdds, stake);
  return NextResponse.json({
    ev,
    expectedRoi: expectedRoi(probability, decimalOdds),
    suggestedStake: fractionalKellyStake({
      bankroll,
      probability,
      decimalOdds,
      fraction: kellyFraction,
      maxStake: bankroll * 0.03,
      dailyRemaining: bankroll * 0.12
    }),
    worstCaseLoss: stake,
    bestCaseProfit: stake * (decimalOdds - 1),
    exposureRatio: stake / bankroll
  });
}
