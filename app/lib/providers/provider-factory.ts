import type { OddsProvider } from "@/app/lib/providers/odds-provider";
import { createMockOddsProvider } from "@/app/lib/providers/mock-odds-provider";
import { createTheOddsApiProvider } from "@/app/lib/providers/the-odds-api-provider";
import { createTxLineProvider } from "@/app/lib/providers/txline-provider";

export function createOddsProvider(): OddsProvider {
  if (process.env.TXLINE_SESSION_JWT && process.env.TXLINE_API_TOKEN) return createTxLineProvider();
  if (process.env.THE_ODDS_API_KEY) return createTheOddsApiProvider();
  return createMockOddsProvider();
}
