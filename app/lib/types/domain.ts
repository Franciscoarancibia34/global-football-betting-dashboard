export type MatchStatus = "PRE" | "LIVE" | "FINAL";

export type LiveOdd = {
  id: string;
  matchId: string;
  country: string;
  league: string;
  kickoffTime: string;
  status: MatchStatus;
  minute?: number;
  homeTeam: string;
  awayTeam: string;
  market: string;
  marketCode: string;
  selection: string;
  bookmaker: string;
  decimalOdds: number;
  openingDecimalOdds: number;
  previousDecimalOdds: number;
  impliedProbability: number;
  normalizedProbability: number;
  fairProbability: number;
  ev: number;
  expectedRoi: number;
  changePct: number;
  timestamp: string;
};

export type DashboardKpis = {
  bankroll: number;
  pnlDaily: number;
  pnlWeekly: number;
  pnlMonthly: number;
  realizedRoi: number;
  expectedRoi: number;
  aggregateRisk: number;
  totalExposure: number;
  activeBets: number;
};

export type DashboardAlert = {
  id: string;
  type: "VALUE_BET" | "ARBITRAGE" | "ODDS_MOVE" | "OVER_EXPOSURE" | "RESPONSIBLE_GAMING";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  createdAt: string;
};

export type ChartPoint = {
  label: string;
  bankroll?: number;
  pnl?: number;
  drawdown?: number;
  risk?: number;
  exposure?: number;
  value?: number;
};
