export function impliedProbability(decimalOdds: number) {
  if (decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}

export function normalizeByOverround(probabilities: number[]) {
  const overround = probabilities.reduce((sum, p) => sum + p, 0);
  if (overround <= 0) return probabilities.map(() => 0);
  return probabilities.map((probability) => probability / overround);
}

export function expectedValue(probability: number, decimalOdds: number, stake: number) {
  const winProfit = stake * (decimalOdds - 1);
  const loss = stake;
  return probability * winProfit - (1 - probability) * loss;
}

export function expectedRoi(probability: number, decimalOdds: number) {
  return probability * decimalOdds - 1;
}

export function fractionalKellyStake(params: {
  bankroll: number;
  probability: number;
  decimalOdds: number;
  fraction: number;
  maxStake: number;
  dailyRemaining: number;
}) {
  const b = params.decimalOdds - 1;
  const q = 1 - params.probability;
  const rawKelly = b <= 0 ? 0 : (b * params.probability - q) / b;
  const suggested = Math.max(0, rawKelly) * params.fraction * params.bankroll;
  return Math.min(suggested, params.maxStake, params.dailyRemaining);
}

export function volatility(returns: number[]) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance);
}

export function maxDrawdown(equityCurve: number[]) {
  let peak = equityCurve[0] ?? 0;
  let drawdown = 0;
  for (const value of equityCurve) {
    peak = Math.max(peak, value);
    if (peak > 0) drawdown = Math.max(drawdown, (peak - value) / peak);
  }
  return drawdown;
}

export function approximateRuinProbability(params: {
  bankroll: number;
  totalExposure: number;
  edge: number;
  volatility: number;
}) {
  if (params.bankroll <= 0) return 1;
  const exposureRatio = params.totalExposure / params.bankroll;
  const edgePenalty = Math.max(0, -params.edge) * 2;
  const volPenalty = Math.min(0.45, params.volatility);
  return Math.min(0.95, Math.max(0.01, exposureRatio * 0.28 + edgePenalty + volPenalty));
}

export function detectArbitrage(oddsBySelection: Record<string, number>) {
  const inverseSum = Object.values(oddsBySelection).reduce((sum, odds) => sum + impliedProbability(odds), 0);
  return {
    isArbitrage: inverseSum > 0 && inverseSum < 1,
    margin: inverseSum > 0 ? 1 - inverseSum : 0
  };
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
