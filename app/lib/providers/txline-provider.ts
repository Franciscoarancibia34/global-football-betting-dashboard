import { expectedRoi, impliedProbability, normalizeByOverround } from "@/app/lib/analytics/betting";
import type { OddsProvider } from "@/app/lib/providers/odds-provider";
import type { LiveOdd, MatchStatus } from "@/app/lib/types/domain";

type TxLineFixture = {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  FixtureGroupId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
};

type TxLineOddsSnapshot = {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  BookmakerId: number;
  SuperOddsType: string;
  InRunning: boolean;
  GameState?: string;
  MarketParameters?: string;
  MarketPeriod?: string;
  PriceNames?: string[];
  Prices?: number[];
  Pct?: string[];
};

function unixMsToIso(value: number) {
  return new Date(value).toISOString();
}

function normalizePrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return price > 100 ? price / 1000 : price;
}

function mapStatus(snapshot?: TxLineOddsSnapshot): MatchStatus {
  if (!snapshot) return "PRE";
  const state = snapshot.GameState?.toLowerCase() ?? "";
  if (state.includes("final") || state.includes("ended") || state.includes("finished")) return "FINAL";
  if (snapshot.InRunning || state.includes("live") || state.includes("running")) return "LIVE";
  return "PRE";
}

function marketCodeFromTxLine(market: string) {
  const normalized = market.toLowerCase();
  if (normalized.includes("1x2") || normalized.includes("match")) return "1X2";
  if (normalized.includes("total") || normalized.includes("over")) return "OU";
  if (normalized.includes("handicap")) return "AH";
  return market.slice(0, 12).toUpperCase();
}

function selectionName(name: string, fixture: TxLineFixture) {
  const lower = name.toLowerCase();
  if (lower === "1" || lower === "part1" || name === fixture.Participant1) return fixture.Participant1IsHome ? "Home" : "Away";
  if (lower === "2" || lower === "part2" || name === fixture.Participant2) return fixture.Participant1IsHome ? "Away" : "Home";
  if (lower === "x" || lower === "draw") return "Draw";
  return name;
}

export function createTxLineProvider(): OddsProvider {
  const baseUrl = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
  const sessionJwt = process.env.TXLINE_SESSION_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  const competitionId = process.env.TXLINE_COMPETITION_ID;
  const maxFixtures = Number(process.env.TXLINE_MAX_FIXTURES ?? 12);

  function headers() {
    if (!sessionJwt || !apiToken) {
      throw new Error("Missing TXLINE_SESSION_JWT or TXLINE_API_TOKEN");
    }
    return {
      Authorization: `Bearer ${sessionJwt}`,
      "X-Api-Token": apiToken
    };
  }

  async function requestJson<T>(path: string, params?: Record<string, string>) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) url.searchParams.set(key, value);
    }
    const response = await fetch(url.toString(), {
      headers: headers(),
      next: { revalidate: 30 }
    });
    if (!response.ok) {
      throw new Error(`TxLINE request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async function fetchFixtureSnapshot() {
    return requestJson<TxLineFixture[]>("/api/fixtures/snapshot", {
      competitionId: competitionId ?? ""
    });
  }

  async function fetchOddsSnapshot(fixtureId: number) {
    return requestJson<TxLineOddsSnapshot[]>(`/api/odds/snapshot/${fixtureId}`);
  }

  return {
    name: "TxLINE",
    async fetchLeagues() {
      const fixtures = await fetchFixtureSnapshot();
      const leagues = new Map<string, { id: string; name: string; country: string }>();
      for (const fixture of fixtures) {
        leagues.set(String(fixture.CompetitionId), {
          id: String(fixture.CompetitionId),
          name: fixture.Competition,
          country: "Global"
        });
      }
      return Array.from(leagues.values());
    },
    async fetchFixtures() {
      const fixtures = await fetchFixtureSnapshot();
      return fixtures.slice(0, maxFixtures).map((fixture) => ({
        id: String(fixture.FixtureId),
        league: fixture.Competition,
        homeTeam: fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2,
        awayTeam: fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1,
        kickoffTime: unixMsToIso(fixture.StartTime)
      }));
    },
    async fetchOdds() {
      const fixtures = (await fetchFixtureSnapshot()).slice(0, maxFixtures);
      const snapshotsByFixture = await Promise.all(
        fixtures.map(async (fixture) => ({
          fixture,
          snapshots: await fetchOddsSnapshot(fixture.FixtureId)
        }))
      );

      const odds: LiveOdd[] = [];

      for (const { fixture, snapshots } of snapshotsByFixture) {
        const homeTeam = fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2;
        const awayTeam = fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1;

        for (const snapshot of snapshots) {
          const prices = snapshot.Prices?.map(normalizePrice) ?? [];
          const priceNames = snapshot.PriceNames ?? prices.map((_, index) => `Selection ${index + 1}`);
          if (!prices.length) continue;

          const implied = prices.map(impliedProbability);
          const pctProbabilities = snapshot.Pct?.map((value) => (value === "NA" ? NaN : Number(value) / 100));
          const normalized = normalizeByOverround(
            pctProbabilities?.every((value) => Number.isFinite(value)) ? (pctProbabilities as number[]) : implied
          );

          prices.forEach((price, index) => {
            if (!price) return;
            const fairProbability = normalized[index] ?? implied[index] ?? 0;
            const ev = expectedRoi(fairProbability, price);
            const selection = priceNames[index] ?? `Selection ${index + 1}`;

            odds.push({
              id: `${snapshot.FixtureId}-${snapshot.BookmakerId}-${snapshot.SuperOddsType}-${selection}`,
              matchId: String(fixture.FixtureId),
              country: "Global",
              league: fixture.Competition,
              kickoffTime: unixMsToIso(fixture.StartTime),
              status: mapStatus(snapshot),
              homeTeam,
              awayTeam,
              market: snapshot.SuperOddsType,
              marketCode: marketCodeFromTxLine(snapshot.SuperOddsType),
              selection: selectionName(selection, fixture),
              bookmaker: snapshot.Bookmaker,
              decimalOdds: price,
              openingDecimalOdds: price,
              previousDecimalOdds: price,
              impliedProbability: implied[index] ?? 0,
              normalizedProbability: fairProbability,
              fairProbability,
              ev,
              expectedRoi: ev,
              changePct: 0,
              timestamp: unixMsToIso(snapshot.Ts)
            });
          });
        }
      }

      return odds;
    },
    subscribeLiveOdds(onOdds) {
      let disposed = false;
      const poll = async () => {
        try {
          if (!disposed) onOdds(await this.fetchOdds());
        } catch {
          if (!disposed) onOdds([]);
        }
      };
      poll();
      const interval = setInterval(poll, 30_000);
      return () => {
        disposed = true;
        clearInterval(interval);
      };
    }
  };
}
