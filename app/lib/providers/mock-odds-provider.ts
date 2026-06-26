import { expectedRoi, impliedProbability, normalizeByOverround } from "@/app/lib/analytics/betting";
import type { LiveOdd } from "@/app/lib/types/domain";
import type { OddsProvider } from "@/app/lib/providers/odds-provider";
import { bookmakers, fixtures, leagues, markets } from "@/app/lib/providers/mock-data";

let tick = 0;
const baseOdds = new Map<string, number>();

function stableOdds(key: string, low: number, high: number) {
  if (!baseOdds.has(key)) {
    const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    baseOdds.set(key, Number((low + (seed % 100) * ((high - low) / 100)).toFixed(2)));
  }
  return baseOdds.get(key)!;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildOdds(): LiveOdd[] {
  tick += 1;
  const now = new Date();
  const odds: LiveOdd[] = [];

  fixtures.forEach(([leagueId, homeTeam, awayTeam, offsetMinutes, status, minute], matchIndex) => {
    const league = leagues.find((item) => item.id === leagueId)!;
    const matchId = `match-${matchIndex + 1}`;
    const kickoffTime = new Date(now.getTime() + Number(offsetMinutes) * 60_000);

    for (const market of markets) {
      const probabilitySeeds = market.selections.map((selection) =>
        impliedProbability(stableOdds(`${matchId}-${market.code}-${selection}-fair`, 1.65, market.code === "1X2" ? 4.2 : 2.4))
      );
      const normalized = normalizeByOverround(probabilitySeeds);

      for (const bookmaker of bookmakers) {
        market.selections.forEach((selection, selectionIndex) => {
          const key = `${matchId}-${market.code}-${selection}-${bookmaker.id}`;
          const opening = stableOdds(key, market.code === "1X2" ? 1.75 : 1.72, market.code === "1X2" ? 4.8 : 2.25);
          const wave = Math.sin((tick + matchIndex * 3 + selectionIndex * 5) / 4) * 0.045;
          const shock = tick % 9 === 0 && selectionIndex === 0 && bookmaker.id === "bk-pinnacle" ? 0.09 : 0;
          const current = Number(clamp(opening * (1 + wave + shock), 1.2, 8.5).toFixed(2));
          const previous = Number(clamp(opening * (1 + wave * 0.55), 1.2, 8.5).toFixed(2));
          const implied = impliedProbability(current);
          const fairProbability = clamp(normalized[selectionIndex] + (selectionIndex === 0 ? 0.025 : -0.01), 0.08, 0.78);
          const ev = expectedRoi(fairProbability, current);

          odds.push({
            id: `${key}-${tick}`,
            matchId,
            country: league.country,
            league: league.name,
            kickoffTime: kickoffTime.toISOString(),
            status: status as LiveOdd["status"],
            minute: minute ?? undefined,
            homeTeam,
            awayTeam,
            market: market.name,
            marketCode: market.code,
            selection,
            bookmaker: bookmaker.name,
            decimalOdds: current,
            openingDecimalOdds: opening,
            previousDecimalOdds: previous,
            impliedProbability: implied,
            normalizedProbability: normalized[selectionIndex] ?? implied,
            fairProbability,
            ev,
            expectedRoi: ev,
            changePct: (current - previous) / previous,
            timestamp: now.toISOString()
          });
        });
      }
    }
  });

  return odds;
}

export function createMockOddsProvider(): OddsProvider {
  return {
    name: "MockGlobalOdds",
    async fetchLeagues() {
      return leagues.map(({ id, name, country }) => ({ id, name, country }));
    },
    async fetchFixtures() {
      return fixtures.map(([leagueId, homeTeam, awayTeam, offsetMinutes], index) => ({
        id: `match-${index + 1}`,
        league: leagues.find((item) => item.id === leagueId)!.name,
        homeTeam,
        awayTeam,
        kickoffTime: new Date(Date.now() + Number(offsetMinutes) * 60_000).toISOString()
      }));
    },
    async fetchOdds() {
      return buildOdds();
    },
    subscribeLiveOdds(onOdds) {
      onOdds(buildOdds());
      const interval = setInterval(() => onOdds(buildOdds()), 2500 + Math.random() * 2000);
      return () => clearInterval(interval);
    }
  };
}
