import type { LiveOdd } from "@/app/lib/types/domain";

export type OddsProvider = {
  name: string;
  fetchLeagues(): Promise<Array<{ id: string; name: string; country: string }>>;
  fetchFixtures(): Promise<Array<{ id: string; league: string; homeTeam: string; awayTeam: string; kickoffTime: string }>>;
  fetchOdds(): Promise<LiveOdd[]>;
  subscribeLiveOdds(onOdds: (odds: LiveOdd[]) => void): () => void;
};
