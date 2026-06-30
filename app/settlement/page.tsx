"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, DatabaseZap, Radio, RefreshCcw, Scale, ShieldCheck, Trophy } from "lucide-react";
import { Badge, Button, Card, cn } from "@/app/components/ui/primitives";
import type { LiveOdd } from "@/app/lib/types/domain";

type SettlementResponse = {
  status: "LIVE" | "DEGRADED";
  provider: string;
  odds: LiveOdd[];
  at: string;
};

type MarketSettlement = {
  id: string;
  match: string;
  league: string;
  status: string;
  market: string;
  selections: number;
  referenceOdds: number;
  strongestMove: number;
  settlementConfidence: number;
  flag: "READY" | "WATCH" | "REVIEW";
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function flagFor(move: number, status: string) {
  if (Math.abs(move) > 0.09) return "REVIEW" as const;
  if (status === "LIVE" || Math.abs(move) > 0.045) return "WATCH" as const;
  return "READY" as const;
}

function confidenceFor(move: number, selections: number, status: string) {
  const base = status === "FINAL" ? 0.94 : status === "LIVE" ? 0.72 : 0.82;
  const movementPenalty = Math.min(0.35, Math.abs(move) * 2.2);
  const completenessBonus = Math.min(0.08, selections / 60);
  return Math.max(0.25, Math.min(0.98, base - movementPenalty + completenessBonus));
}

function useSettlementData() {
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/odds/live", { cache: "no-store" });
      setData(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 12000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, refresh };
}

function buildSettlementRows(odds: LiveOdd[]): MarketSettlement[] {
  const groups = new Map<string, LiveOdd[]>();
  odds.forEach((odd) => {
    const key = `${odd.matchId}:${odd.marketCode}`;
    groups.set(key, [...(groups.get(key) ?? []), odd]);
  });

  return [...groups.entries()]
    .map(([id, items]) => {
      const first = items[0];
      const strongest = items.reduce((best, odd) => (Math.abs(odd.changePct) > Math.abs(best.changePct) ? odd : best), first);
      const avgOdds = items.reduce((sum, odd) => sum + odd.decimalOdds, 0) / Math.max(1, items.length);
      const flag = flagFor(strongest.changePct, first.status);
      return {
        id,
        match: `${first.homeTeam} vs ${first.awayTeam}`,
        league: `${first.country} / ${first.league}`,
        status: first.status,
        market: first.market,
        selections: items.length,
        referenceOdds: avgOdds,
        strongestMove: strongest.changePct,
        settlementConfidence: confidenceFor(strongest.changePct, items.length, first.status),
        flag
      };
    })
    .sort((a, b) => {
      const order = { REVIEW: 0, WATCH: 1, READY: 2 };
      return order[a.flag] - order[b.flag] || a.settlementConfidence - b.settlementConfidence;
    });
}

function SettlementBadge({ flag }: { flag: MarketSettlement["flag"] }) {
  const label = flag === "READY" ? "Ready" : flag === "WATCH" ? "Watch" : "Review";
  return (
    <Badge
      className={cn(
        flag === "READY" && "bg-emerald-100 text-emerald-800",
        flag === "WATCH" && "bg-amber-100 text-amber-800",
        flag === "REVIEW" && "bg-red-100 text-red-800"
      )}
    >
      {label}
    </Badge>
  );
}

export default function SettlementPage() {
  const { data, loading, refresh } = useSettlementData();
  const rows = useMemo(() => buildSettlementRows(data?.odds ?? []), [data?.odds]);
  const reviewCount = rows.filter((row) => row.flag === "REVIEW").length;
  const readyCount = rows.filter((row) => row.flag === "READY").length;
  const averageConfidence = rows.reduce((sum, row) => sum + row.settlementConfidence, 0) / Math.max(1, rows.length);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[linear-gradient(120deg,#07111f,#0f2f2f_50%,#2d1f11)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-emerald-300 text-slate-950">
                <Scale className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-black">Prediction Market Settlement Watch</p>
                <p className="text-sm text-white/65">TxLINE-powered market readiness and discrepancy review</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={data?.status === "LIVE" ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"}>
                <Radio className="h-3 w-3" /> {data?.status ?? "LOADING"}
              </Badge>
              <Badge className="bg-white/10 text-white">{data?.provider ?? "Provider"}</Badge>
              <Button onClick={refresh} className="bg-white text-slate-950 hover:bg-slate-200">
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </header>

          <div className="grid gap-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <Badge className="mb-4 bg-emerald-300/20 text-emerald-100">
                <Trophy className="h-3 w-3" /> Prediction Markets and Settlement
              </Badge>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.04] sm:text-6xl">
                A verification layer for World Cup prediction markets before settlement.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                This view turns live TxLINE odds into settlement readiness signals: complete markets, sharp movements, confidence scores, and review flags for operators or agents.
              </p>
            </div>
            <Card className="border-white/15 bg-white/10 p-5 text-white">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-3xl font-black">{readyCount}</p>
                  <p className="text-xs uppercase text-white/60">Ready</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{reviewCount}</p>
                  <p className="text-xs uppercase text-white/60">Review</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{pct(averageConfidence)}</p>
                  <p className="text-xs uppercase text-white/60">Confidence</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Settlement Readiness Queue</h2>
            <p className="mt-1 text-sm text-white/60">Markets with sharp moves are flagged for manual review before any payout or resolution flow.</p>
          </div>
          <Badge className="w-fit bg-white/10 text-white">
            <ClipboardCheck className="h-3 w-3" /> Informational only
          </Badge>
        </div>
        <Card className="overflow-hidden border-white/10 bg-white text-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Selections</th>
                  <th className="px-4 py-3">Reference odds</th>
                  <th className="px-4 py-3">Strongest move</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Flag</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 16).map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-semibold">{row.market}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.match}</div>
                      <div className="text-xs text-slate-500">{row.league}</div>
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.selections}</td>
                    <td className="px-4 py-3">{row.referenceOdds.toFixed(2)}</td>
                    <td className={cn("px-4 py-3 font-semibold", Math.abs(row.strongestMove) > 0.06 ? "text-red-600" : "text-slate-700")}>{pct(row.strongestMove)}</td>
                    <td className="px-4 py-3">{pct(row.settlementConfidence)}</td>
                    <td className="px-4 py-3"><SettlementBadge flag={row.flag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <DatabaseZap className="h-6 w-6 text-emerald-200" />
          <h3 className="mt-3 font-black">Reference data source</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">TxLINE acts as the normalized source used to compare market state and detect suspicious movement.</p>
        </Card>
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <AlertTriangle className="h-6 w-6 text-amber-200" />
          <h3 className="mt-3 font-black">Discrepancy review</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">Large moves are intentionally marked for manual review before any market resolution or payout process.</p>
        </Card>
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <ShieldCheck className="h-6 w-6 text-cyan-200" />
          <h3 className="mt-3 font-black">No autonomous settlement</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">This demo does not move funds, settle markets, or authorize payouts. It is a readiness and verification layer.</p>
        </Card>
      </section>
    </main>
  );
}
