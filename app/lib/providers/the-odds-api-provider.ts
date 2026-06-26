import { expectedRoi, impliedProbability, normalizeByOverround } from "@/app/lib/analytics/betting";
import type { OddsProvider } from "@/app/lib/providers/odds-provider";
import type { LiveOdd } from "@/app/lib/types/domain";

type OddsApiOutcome = {
  name: string;
  price: number;
};

type OddsApiMarket = {
  key: string;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
};

type OddsApiEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

const marketLabel: Record<string, { code: string; name: string }> = {
  h2h: { code: "1X2", name: "Match Winner" },
  totals: { code: "OU25", name: "Totals" },
  btts: { code: "BTTS", name: "Both Teams To Score" }
};

function mapOutcomeName(outcome: string, homeTeam: string, awayTeam: string) {
  if (outcome === homeTeam) return "Home";
  if (outcome === awayTeam) return "Away";
  if (outcome.toLowerCase() === "draw") return "Draw";
  return outcome;
}

export function createTheOddsApiProvider(): OddsProvider {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const sportKey = process.env.THE_ODDS_SPORT_KEY ?? "soccer_fifa_world_cup";
  const regions = process.env.THE_ODDS_REGIONS ?? "us,uk,eu,au";
  const markets = process.env.THE_ODDS_MARKETS ?? "h2h";

  async function requestOdds() {
    if (!apiKey) return [];
    const params = new URLSearchParams({
      apiKey,
      regions,
      markets,
      oddsFormat: "decimal",
      dateFormat: "iso"
    });
    const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?${params.toString()}`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      throw new Error(`The Odds API failed: ${response.status}`);
    }
    return (await response.json()) as OddsApiEvent[];
  }

  return {
    name: "TheOddsAPI",
    async fetchLeagues() {
      return [{ id: sportKey, name: "FIFA World Cup", country: "FIFA" }];
    },
    async fetchFixtures() {
      const events = await requestOdds();
      return events.map((event) => ({
        id: event.id,
        league: event.sport_title,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        kickoffTime: event.commence_time
      }));
    },
    async fetchOdds() {
      const events = await requestOdds();
      const now = new Date().toISOString();
      const odds: LiveOdd[] = [];

      for (const event of events) {
        for (const bookmaker of event.bookmakers) {
          for (const market of bookmaker.markets) {
            const label = marketLabel[market.key] ?? { code: market.key.toUpperCase(), name: market.key };
            const implied = market.outcomes.map((outcome) => impliedProbability(outcome.price));
            const normalized = normalizeByOverround(implied);
            market.outcomes.forEach((outcome, index) => {
              const fairProbability = normalized[index] ?? impliedProbability(outcome.price);
              const ev = expectedRoi(fairProbability, outcome.price);
              odds.push({
                id: `${event.id}-${bookmaker.key}-${market.key}-${outcome.name}`,
                matchId: event.id,
                country: "FIFA",
                league: event.sport_title,
                kickoffTime: event.commence_time,
                status: "PRE",
                homeTeam: event.home_team,
                awayTeam: event.away_team,
                market: label.name,
                marketCode: label.code,
                selection: mapOutcomeName(outcome.name, event.home_team, event.away_team),
                bookmaker: bookmaker.title,
                decimalOdds: outcome.price,
                openingDecimalOdds: outcome.price,
                previousDecimalOdds: outcome.price,
                impliedProbability: implied[index] ?? 0,
                normalizedProbability: fairProbability,
                fairProbability,
                ev,
                expectedRoi: ev,
                changePct: 0,
                timestamp: bookmaker.last_update ?? now
              });
            });
          }
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
      const interval = setInterval(poll, 60_000);
      return () => {
        disposed = true;
        clearInterval(interval);
      };
    }
  };
}
