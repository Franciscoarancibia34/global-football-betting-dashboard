"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Download,
  Gauge,
  LineChart,
  Moon,
  PauseCircle,
  Plus,
  Radio,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wallet
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge, Button, Card, IconButton, Input, Select, cn } from "@/app/components/ui/primitives";
import type { ChartPoint, DashboardAlert, DashboardKpis, LiveOdd } from "@/app/lib/types/domain";

type Overview = {
  kpis: DashboardKpis;
  charts: {
    bankroll: ChartPoint[];
    drawdown: ChartPoint[];
    distribution: ChartPoint[];
    riskHeatmap: ChartPoint[];
  };
};

const defaultKpis: DashboardKpis = {
  bankroll: 0,
  pnlDaily: 0,
  pnlWeekly: 0,
  pnlMonthly: 0,
  realizedRoi: 0,
  expectedRoi: 0,
  aggregateRisk: 0,
  totalExposure: 0,
  activeBets: 0
};

const navItems = [
  ["Overview", BarChart3],
  ["Live Odds", Radio],
  ["Opportunities", Bell],
  ["Portfolio", Wallet],
  ["Risk Lab", Gauge],
  ["Settings", SlidersHorizontal]
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function useDashboardData() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [odds, setOdds] = useState<LiveOdd[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [providerName, setProviderName] = useState("MockGlobalOdds");
  const [status, setStatus] = useState<"LIVE" | "DEGRADED">("DEGRADED");
  const providerRef = useRef("MockGlobalOdds");

  async function refresh() {
    const [overviewRes, oddsRes, alertsRes] = await Promise.all([
      fetch("/api/overview"),
      fetch("/api/odds/live"),
      fetch("/api/alerts")
    ]);
    const [overviewData, oddsData, alertData] = await Promise.all([overviewRes.json(), oddsRes.json(), alertsRes.json()]);
    setOverview(overviewData);
    setOdds(oddsData.odds);
    setAlerts(alertData.alerts);
    setProviderName(oddsData.provider ?? "MockGlobalOdds");
    providerRef.current = oddsData.provider ?? "MockGlobalOdds";
    setStatus(oddsData.status ?? "LIVE");
  }

  useEffect(() => {
    refresh().catch(() => setStatus("DEGRADED"));
    let socket: Socket | undefined;
    try {
      socket = io({ path: "/api/socket", transports: ["websocket", "polling"] });
      socket.on("connect", () => setStatus("LIVE"));
      socket.on("disconnect", () => setStatus("DEGRADED"));
      socket.on("odds:update", (payload) => {
        if (providerRef.current !== "MockGlobalOdds" && payload.provider === "MockGlobalOdds") return;
        setStatus(payload.status ?? "LIVE");
        setOdds(payload.odds ?? []);
        setAlerts(payload.alerts ?? []);
        setOverview((current) => (current ? { ...current, kpis: payload.kpis ?? current.kpis } : current));
      });
    } catch {
      setStatus("DEGRADED");
    }
    const interval = setInterval(() => refresh().catch(() => setStatus("DEGRADED")), 6000);
    return () => {
      socket?.disconnect();
      clearInterval(interval);
    };
  }, []);

  return { overview, odds, alerts, providerName, status, refresh };
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  tone?: "neutral" | "good" | "risk";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted-foreground))]">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{detail}</p>
        </div>
        <div
          className={cn(
            "rounded-md p-2",
            tone === "good" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            tone === "risk" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
            tone === "neutral" && "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function LiveOddsTable({ odds }: { odds: LiveOdd[] }) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("ALL");
  const rows = useMemo(
    () =>
      odds
        .filter((odd) => market === "ALL" || odd.marketCode === market)
        .filter((odd) => `${odd.country} ${odd.league} ${odd.homeTeam} ${odd.awayTeam} ${odd.bookmaker}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 18),
    [odds, query, market]
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">World Cup Watchlist & Odds</h2>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">Partidos del Mundial para monitorear con proveedor realtime; compara manualmente contra Betano antes de apostar.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[rgb(var(--muted-foreground))]" />
            <Input className="pl-9" placeholder="Liga, equipo, casa" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={market} onChange={(event) => setMarket(event.target.value)} className="w-28">
            <option value="ALL">Todos</option>
            <option value="1X2">1X2</option>
            <option value="OU25">O/U</option>
            <option value="BTTS">BTTS</option>
            <option value="AH">AH</option>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[rgb(var(--muted))] text-xs uppercase text-[rgb(var(--muted-foreground))]">
            <tr>
              <th className="px-4 py-3">Partido</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Mercado</th>
              <th className="px-4 py-3">Casa</th>
              <th className="px-4 py-3">Odds</th>
              <th className="px-4 py-3">Apertura</th>
              <th className="px-4 py-3">Var.</th>
              <th className="px-4 py-3">Prob.</th>
              <th className="px-4 py-3">EV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((odd) => (
              <tr key={odd.id} className="border-t border-[rgb(var(--border))]">
                <td className="px-4 py-3">
                  <div className="font-semibold">{odd.homeTeam} vs {odd.awayTeam}</div>
                  <div className="text-xs text-[rgb(var(--muted-foreground))]">{odd.country} / {odd.league}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={odd.status === "LIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : ""}>
                    {odd.status}{odd.minute ? ` ${odd.minute}'` : ""}
                  </Badge>
                </td>
                <td className="px-4 py-3">{odd.market}<div className="text-xs text-[rgb(var(--muted-foreground))]">{odd.selection}</div></td>
                <td className="px-4 py-3">{odd.bookmaker}</td>
                <td className="px-4 py-3 font-bold">{odd.decimalOdds.toFixed(2)}</td>
                <td className="px-4 py-3">{odd.openingDecimalOdds.toFixed(2)}</td>
                <td className={cn("px-4 py-3 font-semibold", Math.abs(odd.changePct) > 0.05 && "text-red-600 dark:text-red-300")}>{pct(odd.changePct)}</td>
                <td className="px-4 py-3">{pct(odd.normalizedProbability)}</td>
                <td className={cn("px-4 py-3 font-bold", odd.ev > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-[rgb(var(--muted-foreground))]")}>{pct(odd.ev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Alertas inteligentes</h2>
        <Bell className="h-5 w-5 text-[rgb(var(--accent-2))]" />
      </div>
      <div className="space-y-3">
        {alerts.slice(0, 7).map((alert) => (
          <div key={alert.id} className="rounded-md border border-[rgb(var(--border))] p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className={cn("mt-0.5 h-4 w-4", alert.severity === "CRITICAL" ? "text-red-500" : "text-amber-500")} />
              <div>
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{alert.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentSignalPanel({ odds }: { odds: LiveOdd[] }) {
  const signal = useMemo(() => {
    const candidates = odds
      .filter((odd) => odd.decimalOdds >= 1.01 && odd.decimalOdds <= 25)
      .map((odd) => {
        const movementScore = Math.abs(odd.changePct);
        const valueScore = Math.max(0, odd.ev);
        const confidence = Math.min(0.99, movementScore * 4 + valueScore * 2 + 0.35);
        return {
          odd,
          score: movementScore * 2 + valueScore,
          movementScore,
          valueScore,
          confidence
        };
      })
      .sort((a, b) => b.score - a.score);

    return candidates[0];
  }, [odds]);

  if (!signal) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[rgb(var(--accent-2))]" />
          <h2 className="text-lg font-bold">TxLINE Agent Signal</h2>
        </div>
        <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">Esperando feed TxLINE para generar una senal automatica.</p>
      </Card>
    );
  }

  const { odd, confidence, movementScore, valueScore } = signal;
  const direction = odd.changePct > 0 ? "subio" : odd.changePct < 0 ? "cayo" : "se mantuvo";
  const action = odd.ev > 0.05 && movementScore > 0.02 ? "investigar ahora" : odd.ev > 0 ? "poner en watchlist" : "solo monitorear";

  return (
    <Card className="border-[rgb(var(--accent-2))]/40 bg-sky-50 p-4 dark:bg-sky-950/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[rgb(var(--accent-2))]" />
            <h2 className="text-lg font-bold">TxLINE Agent Signal</h2>
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Agente deterministico que resume el movimiento mas accionable del feed.</p>
        </div>
        <Badge className={action === "investigar ahora" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : ""}>
          {action}
        </Badge>
      </div>
      <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm">
        <p className="font-semibold">{odd.homeTeam} vs {odd.awayTeam}</p>
        <p className="mt-1 text-[rgb(var(--muted-foreground))]">
          {odd.market} / {odd.selection}: la cuota {direction} {pct(Math.abs(odd.changePct))} y el modelo marca EV {pct(odd.ev)}.
        </p>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3 xl:grid-cols-1">
        <Badge>Confianza {pct(confidence)}</Badge>
        <Badge>Movimiento {pct(movementScore)}</Badge>
        <Badge>Value score {pct(valueScore)}</Badge>
      </div>
    </Card>
  );
}

function MarketRadar({ odds }: { odds: LiveOdd[] }) {
  const candidates = useMemo(() => {
    const groups = new Map<string, { label: string; match: string; selection: string; market: string; avgOdds: number; fairProbability: number; count: number }>();
    odds
      .filter((odd) => odd.marketCode === "1X2" && odd.decimalOdds >= 1.01 && odd.decimalOdds <= 25)
      .forEach((odd) => {
        const key = `${odd.matchId}-${odd.selection}`;
        const current = groups.get(key) ?? {
          label: `${odd.homeTeam} vs ${odd.awayTeam} / ${odd.selection}`,
          match: `${odd.homeTeam} vs ${odd.awayTeam}`,
          selection: odd.selection,
          market: odd.market,
          avgOdds: 0,
          fairProbability: 0,
          count: 0
        };
        current.avgOdds += odd.decimalOdds;
        current.fairProbability += odd.normalizedProbability;
        current.count += 1;
        groups.set(key, current);
      });

    return [...groups.values()].map((item) => ({
      ...item,
      avgOdds: item.count ? item.avgOdds / item.count : 0,
      fairProbability: item.count ? item.fairProbability / item.count : 0
    }));
  }, [odds]);

  const [selected, setSelected] = useState("");
  const [betanoOdds, setBetanoOdds] = useState(1.7);
  const [probability, setProbability] = useState(0.62);
  const [bankroll, setBankroll] = useState(40);
  const [stake, setStake] = useState(1);
  const candidate = candidates.find((item) => item.label === selected) ?? candidates[0];
  const effectiveSelected = selected || candidate?.label || "";
  const breakEven = betanoOdds > 1 ? 1 / betanoOdds : 0;
  const ev = probability * betanoOdds - 1;
  const edgeVsMarket = candidate?.avgOdds ? betanoOdds / candidate.avgOdds - 1 : 0;
  const kellyRaw = betanoOdds > 1 ? ((betanoOdds - 1) * probability - (1 - probability)) / (betanoOdds - 1) : 0;
  const kellyQuarter = Math.max(0, kellyRaw) * bankroll * 0.25;
  const verdict =
    ev > 0.06 && edgeVsMarket > 0.015
      ? "Candidata"
      : ev > 0 && edgeVsMarket >= 0
        ? "Mirar con calma"
        : "Descartar";

  useEffect(() => {
    if (!selected && candidates[0]) setSelected(candidates[0].label);
  }, [candidates, selected]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Radar mercado a Betano</h2>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            Usa cuotas de mercado como referencia. Luego pega manualmente la cuota Betano antes de apostar.
          </p>
        </div>
        <Badge className={verdict === "Candidata" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : verdict === "Descartar" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : ""}>
          {verdict}
        </Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
        <label className="text-sm font-medium">
          Señal de mercado
          <Select className="mt-1" value={effectiveSelected} onChange={(event) => setSelected(event.target.value)}>
            {candidates.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium">
          Cuota Betano
          <Input className="mt-1" type="number" step="0.01" value={betanoOdds} onChange={(event) => setBetanoOdds(Number(event.target.value))} />
        </label>
        <label className="text-sm font-medium">
          Prob. estimada
          <Input className="mt-1" type="number" step="0.01" value={probability} onChange={(event) => setProbability(Number(event.target.value))} />
        </label>
        <label className="text-sm font-medium">
          Bankroll
          <Input className="mt-1" type="number" step="0.01" value={bankroll} onChange={(event) => setBankroll(Number(event.target.value))} />
        </label>
        <label className="text-sm font-medium">
          Stake
          <Input className="mt-1" type="number" step="0.01" value={stake} onChange={(event) => setStake(Number(event.target.value))} />
        </label>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-6">
        <Badge>Mercado avg {candidate ? candidate.avgOdds.toFixed(2) : "N/A"}</Badge>
        <Badge>Mejora vs mercado {pct(edgeVsMarket)}</Badge>
        <Badge>Break-even {pct(breakEven)}</Badge>
        <Badge>EV {money(ev * stake)}</Badge>
        <Badge>ROI {pct(ev)}</Badge>
        <Badge>Kelly 1/4 {money(kellyQuarter)}</Badge>
      </div>
    </Card>
  );
}

function StakeSimulator() {
  const [result, setResult] = useState<{ ev: number; expectedRoi: number; suggestedStake: number; worstCaseLoss: number; bestCaseProfit: number; exposureRatio: number } | null>(null);
  const [form, setForm] = useState({ bankroll: 1250, decimalOdds: 2.1, probability: 0.52, stake: 20, kellyFraction: 0.5 });

  async function simulate() {
    const response = await fetch("/api/risk/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    setResult(await response.json());
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Risk Lab</h2>
        <Gauge className="h-5 w-5 text-[rgb(var(--accent))]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(form).map(([key, value]) => (
          <label key={key} className="text-sm font-medium capitalize">
            {key.replace(/([A-Z])/g, " $1")}
            <Input
              type="number"
              step={key === "kellyFraction" ? 0.25 : 0.01}
              value={value}
              onChange={(event) => setForm((current) => ({ ...current, [key]: Number(event.target.value) }))}
              className="mt-1"
            />
          </label>
        ))}
      </div>
      <Button onClick={simulate} className="mt-4 w-full"><LineChart className="h-4 w-4" /> Simular stake</Button>
      {result && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Badge>EV {money(result.ev)}</Badge>
          <Badge>ROI {pct(result.expectedRoi)}</Badge>
          <Badge>Kelly {money(result.suggestedStake)}</Badge>
          <Badge>Exposicion {pct(result.exposureRatio)}</Badge>
        </div>
      )}
    </Card>
  );
}

function WorldCupUseGuide() {
  return (
    <Card className="border-[rgb(var(--accent-2))]/40 bg-sky-50 p-4 dark:bg-sky-950/20">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 text-[rgb(var(--accent-2))]" />
        <div>
          <h2 className="text-lg font-bold">Modo util para el Mundial</h2>
          <p className="mt-1 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            Usa la tabla como watchlist de partidos reales y el Risk Lab para pegar cuotas reales desde Betano, Bet365, Coolbet u otra casa. El dashboard calcula probabilidad implicita, EV, ROI esperado y stake sugerido. No apuestes si no tienes una probabilidad propia razonada mayor que la probabilidad implicita de la cuota.
          </p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <Badge>1. Copia cuota real</Badge>
            <Badge>2. Estima probabilidad justa</Badge>
            <Badge>3. Simula stake antes de apostar</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Charts({ overview }: { overview: Overview | null }) {
  const charts = overview?.charts;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="p-4 xl:col-span-2">
        <h2 className="mb-4 text-lg font-bold">Bankroll y PnL</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <ReLineChart data={charts?.bankroll ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bankroll" stroke="rgb(var(--accent-2))" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="pnl" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-bold">Distribucion</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={charts?.distribution ?? []} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95}>
                {(charts?.distribution ?? []).map((_, index) => (
                  <Cell key={index} fill={["#2670ff", "#00a676", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-bold">Drawdown</h2>
        <div className="h-60">
          <ResponsiveContainer>
            <AreaChart data={charts?.drawdown ?? []}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="drawdown" fill="#ef4444" stroke="#ef4444" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 xl:col-span-2">
        <h2 className="mb-4 text-lg font-bold">Heatmap de riesgo por horario</h2>
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={charts?.riskHeatmap ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="exposure" fill="#00a676" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function ResponsibleGaming({ exposure, bankroll }: { exposure: number; bankroll: number }) {
  const ratio = bankroll ? exposure / bankroll : 0;
  return (
    <Card className="border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5" />
        <div>
          <h2 className="font-bold">Juego responsable</h2>
          <p className="mt-1 text-sm">Herramienta informativa/analitica. No garantiza ganancias.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Exposicion {pct(ratio)}</Badge>
            <Badge>Tope diario activo</Badge>
            <Badge>Pausa disponible</Badge>
          </div>
        </div>
        <Button className="ml-auto bg-amber-900 text-white hover:bg-amber-800"><PauseCircle className="h-4 w-4" /> Pausar</Button>
      </div>
    </Card>
  );
}

export default function Home() {
  const { overview, odds, alerts, providerName, status, refresh } = useDashboardData();
  const [dark, setDark] = useState(false);
  const kpis = overview?.kpis ?? defaultKpis;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <main className="min-h-screen">
      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold leading-tight">Football Intel</p>
              <p className="text-xs text-[rgb(var(--muted-foreground))]">Global odds command</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {navItems.map(([label, Icon], index) => (
              <a key={label} href={`#${label.toLowerCase().replaceAll(" ", "-")}`} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]", index === 0 && "bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]")}>
                <Icon className="h-4 w-4" /> {label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className={status === "LIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700"}>{status}</Badge>
                <Badge>{providerName}</Badge>
                <Badge>Redis-ready</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">World Cup Betting Intelligence Dashboard</h1>
              <p className="mt-2 max-w-3xl text-[rgb(var(--muted-foreground))]">Mesa de decision para el Mundial: watchlist de partidos, cuotas manuales/realtime, valor esperado, riesgo y portfolio.</p>
            </div>
            <div className="flex gap-2">
              <IconButton onClick={() => setDark((value) => !value)} aria-label="Toggle theme">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</IconButton>
              <Button onClick={() => refresh()}><RefreshCcw className="h-4 w-4" /> Actualizar</Button>
            </div>
          </header>

          <ResponsibleGaming exposure={kpis.totalExposure} bankroll={kpis.bankroll} />

          <section className="mt-6">
            <WorldCupUseGuide />
          </section>

          <section id="overview" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Bankroll" value={money(kpis.bankroll)} detail="Saldo analitico actual" icon={Wallet} />
            <KpiCard label="PnL mensual" value={money(kpis.pnlMonthly)} detail={`Diario ${money(kpis.pnlDaily)}`} icon={LineChart} tone="good" />
            <KpiCard label="ROI esperado" value={pct(kpis.expectedRoi)} detail={`Realizado ${pct(kpis.realizedRoi)}`} icon={BarChart3} tone="good" />
            <KpiCard label="Riesgo agregado" value={pct(kpis.aggregateRisk)} detail={`${kpis.activeBets} apuestas activas`} icon={Gauge} tone="risk" />
          </section>

          <section className="mt-6">
            <Charts overview={overview} />
          </section>

          <section className="mt-6">
            <MarketRadar odds={odds} />
          </section>

          <section id="live-odds" className="mt-6">
            <LiveOddsTable odds={odds} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
            <div id="portfolio" className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Portfolio de apuestas</h2>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">CRUD preparado via API, limites responsables y exportacion CSV.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button><Plus className="h-4 w-4" /> Añadir apuesta</Button>
                    <a href="/api/export/bets"><Button className="bg-[rgb(var(--accent-2))]"><Download className="h-4 w-4" /> CSV</Button></a>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Badge>Win rate 56%</Badge>
                  <Badge>Yield 7.1%</Badge>
                  <Badge>CLV +2.4%</Badge>
                  <Badge>Racha W-W-L-W</Badge>
                </div>
              </Card>
              <Card className="p-4">
                <h2 className="mb-3 text-lg font-bold">Roadmap ML plug-in</h2>
                <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                  La capa OddsProvider ya permite cambiar el mock por proveedores reales. El campo model_probabilities queda listo para enchufar modelos de forma, lesiones, xG, ELO y closing line value.
                </p>
              </Card>
            </div>
            <aside className="space-y-4">
              <AgentSignalPanel odds={odds} />
              <AlertsPanel alerts={alerts} />
              <StakeSimulator />
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}
