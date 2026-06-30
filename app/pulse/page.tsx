"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BellRing, Flame, Goal, Radio, RefreshCcw, ShieldCheck, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { Badge, Button, Card, cn } from "@/app/components/ui/primitives";
import type { LiveOdd } from "@/app/lib/types/domain";

type PulseResponse = {
  status: "LIVE" | "DEGRADED";
  provider: string;
  odds: LiveOdd[];
  at: string;
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function usePulseData() {
  const [data, setData] = useState<PulseResponse | null>(null);
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
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, refresh };
}

function groupMatches(odds: LiveOdd[]) {
  const matches = new Map<string, LiveOdd[]>();
  odds.forEach((odd) => {
    const current = matches.get(odd.matchId) ?? [];
    current.push(odd);
    matches.set(odd.matchId, current);
  });

  return [...matches.values()]
    .map((items) => {
      const first = items[0];
      const biggestMove = items.reduce((best, odd) => (Math.abs(odd.changePct) > Math.abs(best.changePct) ? odd : best), first);
      const bestValue = items.reduce((best, odd) => (odd.ev > best.ev ? odd : best), first);
      const heat = Math.min(99, Math.round((Math.abs(biggestMove.changePct) * 420 + Math.max(0, bestValue.ev) * 280 + (first.status === "LIVE" ? 22 : 10)) * 10));
      return {
        id: first.matchId,
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        league: first.league,
        country: first.country,
        kickoffTime: first.kickoffTime,
        status: first.status,
        minute: first.minute,
        biggestMove,
        bestValue,
        heat
      };
    })
    .sort((a, b) => b.heat - a.heat);
}

function buildNarration(match: ReturnType<typeof groupMatches>[number]) {
  const move = match.biggestMove;
  const value = match.bestValue;
  const direction = move.changePct > 0 ? "sube" : move.changePct < 0 ? "cae" : "se mantiene";

  if (Math.abs(move.changePct) > 0.07) {
    return `El mercado se movio fuerte: ${move.selection} ${direction} ${pct(Math.abs(move.changePct))}. El partido esta caliente.`;
  }

  if (value.ev > 0.04) {
    return `El pulso detecta valor relativo en ${value.selection}: EV ${pct(value.ev)}. Vale mirarlo con calma.`;
  }

  if (match.status === "LIVE") {
    return "Partido en vivo con feed activo. Aun no hay ruptura clara, pero el mercado esta reaccionando.";
  }

  return "Previa estable. El pulso recomienda esperar una senal mas fuerte antes de actuar.";
}

function MatchPulseCard({ match, rank }: { match: ReturnType<typeof groupMatches>[number]; rank: number }) {
  const hot = match.heat >= 75;
  return (
    <Card className={cn("overflow-hidden p-4", hot && "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={hot ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : ""}>
              #{rank} Pulse {match.heat}
            </Badge>
            <Badge>{match.status}{match.minute ? ` ${match.minute}'` : ""}</Badge>
            <Badge>{formatTime(match.kickoffTime)}</Badge>
          </div>
          <h3 className="text-xl font-black leading-tight">{match.homeTeam} vs {match.awayTeam}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{match.country} / {match.league}</p>
        </div>
        <div className={cn("grid h-14 w-14 place-items-center rounded-md", hot ? "bg-rose-600 text-white" : "bg-[rgb(var(--muted))]")}>
          {hot ? <Flame className="h-7 w-7" /> : <Activity className="h-7 w-7" />}
        </div>
      </div>
      <p className="mt-4 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm leading-6">{buildNarration(match)}</p>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Badge>Mayor cambio {match.biggestMove.selection} {pct(match.biggestMove.changePct)}</Badge>
        <Badge>Mejor EV {match.bestValue.selection} {pct(match.bestValue.ev)}</Badge>
        <Badge>Cuota ref. {match.bestValue.decimalOdds.toFixed(2)}</Badge>
      </div>
    </Card>
  );
}

export default function PulsePage() {
  const { data, loading, refresh } = usePulseData();
  const matches = useMemo(() => groupMatches(data?.odds ?? []), [data?.odds]);
  const heroMatch = matches[0];
  const hotCount = matches.filter((match) => match.heat >= 75).length;

  return (
    <main className="min-h-screen bg-[#f8f3e8] text-slate-950">
      <section className="relative overflow-hidden bg-[#163b2d] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0_1px,transparent_1px_76px),linear-gradient(90deg,rgba(22,163,74,0.35),rgba(20,184,166,0.18)_42%,rgba(251,146,60,0.28))]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_96px)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-slate-950">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black leading-tight">World Cup Live Pulse</p>
                <p className="text-sm text-white/70">Fan experience powered by TxLINE</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={data?.status === "LIVE" ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"}>
                <Radio className="h-3 w-3" /> {data?.status ?? "LOADING"}
              </Badge>
              <Badge className="bg-white/10 text-white">{data?.provider ?? "Provider"}</Badge>
              <Button onClick={refresh} className="bg-white text-slate-950 hover:bg-slate-200">
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </header>

          <div className="grid gap-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <Badge className="mb-4 bg-cyan-300/20 text-cyan-100">
                <Sparkles className="h-3 w-3" /> Consumer and Fan Experiences
              </Badge>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] sm:text-6xl">
                The market story of every World Cup match, explained like a live broadcast.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">
                Live Pulse turns TxLINE odds, match state, and market movement into a simple fan layer: hot matches, momentum shifts, and plain-language explanations of what the market thinks now.
              </p>
            </div>
            <Card className="border-white/20 bg-[#fff7ed]/95 p-5 text-slate-950 shadow-2xl shadow-black/20">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-3xl font-black">{matches.length}</p>
                  <p className="text-xs uppercase text-slate-500">Matches</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{hotCount}</p>
                  <p className="text-xs uppercase text-slate-500">Hot</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{data?.odds?.length ?? 0}</p>
                  <p className="text-xs uppercase text-slate-500">Signals</p>
                </div>
              </div>
              {heroMatch && (
                <div className="mt-5 rounded-md bg-[#163b2d] p-4 text-white">
                  <p className="text-sm text-white/65">Hottest now</p>
                  <p className="mt-1 text-xl font-black">{heroMatch.homeTeam} vs {heroMatch.awayTeam}</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{buildNarration(heroMatch)}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Live Match Pulseboard</h2>
            <p className="mt-1 text-sm text-slate-600">Ranked by odds movement, value pressure, and match state.</p>
          </div>
          <Badge className="w-fit bg-emerald-100 text-emerald-800">
            <BellRing className="h-3 w-3" /> Updates every 10s
          </Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.slice(0, 8).map((match, index) => (
            <MatchPulseCard key={match.id} match={match} rank={index + 1} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <Card className="border-emerald-200 bg-white p-4">
          <Goal className="h-6 w-6 text-emerald-700" />
          <h3 className="mt-3 font-black">Plain-language market pulse</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">No trading jargon required: fans see why a match is heating up and what changed.</p>
        </Card>
        <Card className="border-orange-200 bg-white p-4">
          <TrendingUp className="h-6 w-6 text-orange-600" />
          <h3 className="mt-3 font-black">Real-time ranking</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">The pulse score turns every odds update into a ranked watchlist of matches worth opening.</p>
        </Card>
        <Card className="border-cyan-200 bg-white p-4">
          <ShieldCheck className="h-6 w-6 text-cyan-700" />
          <h3 className="mt-3 font-black">Responsible by design</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">This is an informational fan experience. It does not place bets or promise profitable outcomes.</p>
        </Card>
      </section>
    </main>
  );
}
