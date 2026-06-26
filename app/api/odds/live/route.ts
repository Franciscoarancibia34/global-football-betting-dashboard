import { NextResponse } from "next/server";
import { createOddsProvider } from "@/app/lib/providers/provider-factory";
import { createMockOddsProvider } from "@/app/lib/providers/mock-odds-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = createOddsProvider();
  let odds = [];
  let degradedReason: string | undefined;
  try {
    odds = await provider.fetchOdds();
  } catch (error) {
    degradedReason = error instanceof Error ? error.message : "Unknown provider error";
    odds = await createMockOddsProvider().fetchOdds();
  }
  return NextResponse.json({
    status: degradedReason ? "DEGRADED" : "LIVE",
    provider: provider.name,
    degradedReason,
    odds,
    at: new Date().toISOString()
  });
}
