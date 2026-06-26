import { describe, expect, it } from "vitest";
import {
  detectArbitrage,
  expectedRoi,
  expectedValue,
  fractionalKellyStake,
  impliedProbability,
  normalizeByOverround
} from "../../app/lib/analytics/betting";

describe("betting analytics", () => {
  it("calculates implied probability from decimal odds", () => {
    expect(impliedProbability(2)).toBe(0.5);
  });

  it("normalizes bookmaker overround", () => {
    const normalized = normalizeByOverround([0.55, 0.55]);
    expect(normalized[0]).toBeCloseTo(0.5);
    expect(normalized[1]).toBeCloseTo(0.5);
  });

  it("calculates EV and expected ROI", () => {
    expect(expectedValue(0.55, 2.1, 10)).toBeCloseTo(1.55);
    expect(expectedRoi(0.55, 2.1)).toBeCloseTo(0.155);
  });

  it("caps fractional Kelly by configured limits", () => {
    const stake = fractionalKellyStake({
      bankroll: 1000,
      probability: 0.58,
      decimalOdds: 2.1,
      fraction: 0.5,
      maxStake: 30,
      dailyRemaining: 25
    });
    expect(stake).toBeLessThanOrEqual(25);
  });

  it("detects arbitrage when inverse odds sum is below one", () => {
    expect(detectArbitrage({ home: 2.2, away: 2.2 }).isArbitrage).toBe(true);
  });
});
