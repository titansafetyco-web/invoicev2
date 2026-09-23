"use client";
import { useState, type ReactNode } from "react";
import { CheckCircle2, Clock, FileText, type LucideIcon } from "lucide-react";
import { Doc } from "@/lib/types";
import { money, totals } from "@/lib/format";
import { normalizeResources } from "@/lib/resources";

type RangeId = "week" | "month" | "year" | "all";

const RANGES: { id: RangeId; label: string }[] = [
  { id: "week", label: "1 week" },
  { id: "month", label: "1 month" },
  { id: "year", label: "1 year" },
  { id: "all", label: "All" },
];

const SERIES: {
  key: string;
  label: string;
  short: string;
  color: string;
  icon: LucideIcon;
  match: (d: Doc) => boolean;
  at: (d: Doc) => string | null;
}[] = [
  { key: "estimates", label: "Open estimates", short: "open", color: "#0b2c6b", icon: FileText, match: (d) => d.type === "estimate" && d.status === "draft", at: (d) => d.created_at },
  { key: "unpaid", label: "Unpaid invoices", short: "unpaid", color: "#c8102e", icon: Clock, match: (d) => d.type === "invoice" && d.status === "pending", at: (d) => d.sent_at || d.created_at },
  { key: "paid", label: "Paid to date", short: "paid", color: "#15803d", icon: CheckCircle2, match: (d) => d.type === "invoice" && d.status === "paid", at: (d) => d.paid_at || d.created_at },
];

const VB_W = 720;
const VB_H = 220;
const PAD_L = 52;
const PAD_R = 28;
const PAD_T = 16;
const PAD_B = 32;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

function amount(d: Doc) {
  return totals(d.line_items, Number(d.tax_rate) || 0, normalizeResources(d.resources)).total;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function compact(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return money(n);
}

function niceMax(n: number) {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const scaled = n / pow;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * pow;
}

type Bucket = { label: string; start: number; end: number };

function buildBuckets(range: RangeId, docs: Doc[]): Bucket[] {
  const now = new Date();
  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const start = startOfDay(addDays(now, i - 6));
      return { label: start.toLocaleDateString("en-US", { weekday: "short" }), start: start.getTime(), end: startOfDay(addDays(start, 1)).getTime() };
    });
  }
  if (range === "month") {
    return Array.from({ length: 30 }, (_, i) => {
      const start = startOfDay(addDays(now, i - 29));
      const show = i % 5 === 0 || i === 29;
      return {
        label: show ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
        start: start.getTime(),
        end: startOfDay(addDays(start, 1)).getTime(),
      };
    });
  }
  if (range === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1);
      return { label: start.toLocaleDateString("en-US", { month: "short" }), start: start.getTime(), end: next.getTime() };
    });
  }
  const stamps = docs.flatMap((d) => [d.created_at, d.paid_at, d.sent_at].filter((v): v is string => Boolean(v)).map((v) => new Date(v).getTime()).filter((t) => !Number.isNaN(t)));
  const first = stamps.length ? new Date(Math.min(...stamps)) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 1);
  const months: Bucket[] = [];
  while (cursor <= last && months.length < 36) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    months.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      start: cursor.getTime(),
      end: next.getTime(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (!months.length) return buildBuckets("year", docs);
  if (months.length <= 12) return months;
  const step = Math.ceil(months.length / 8);
  return months.map((bucket, i) => ({ ...bucket, label: i % step === 0 || i === months.length - 1 ? bucket.label : "" }));
}

function seriesFor(docs: Doc[], buckets: Bucket[]) {
  return SERIES.map((series) => {
    const rows = docs.filter(series.match);
    const values = buckets.map((b) => rows.reduce((sum, d) => {
      const stamp = series.at(d);
      if (!stamp) return sum;
      const t = new Date(stamp).getTime();
      return t >= b.start && t < b.end ? sum + amount(d) : sum;
    }, 0));
    return { ...series, values, total: rows.reduce((sum, d) => sum + amount(d), 0), count: rows.length };
  });
}

function linePath(values: number[], max: number) {
  const n = values.length;
  return values.map((v, i) => {
    const x = PAD_L + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
    const y = PAD_T + PLOT_H - (v / max) * PLOT_H;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function currentWeek(): Bucket[] {
  const now = new Date();
  const weekday = now.getDay();
  const monday = startOfDay(addDays(now, weekday === 0 ? -6 : 1 - weekday));
  return Array.from({ length: 7 }, (_, i) => {
    const start = addDays(monday, i);
    return {
      label: start.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      start: start.getTime(),
      end: startOfDay(addDays(start, 1)).getTime(),
    };
  });
}

function WeekBars({ days, color }: { days: { letter: string; value: number }[]; color: string }) {
  const max = Math.max(...days.map((day) => day.value), 0);
  return (
    <div className="mt-4 flex gap-1" aria-label="This week">
      {days.map((day, i) => {
        const height = max === 0 ? 18 : Math.max(day.value === 0 ? 12 : 18, Math.round((day.value / max) * 100));
        return (
          <div key={`${day.letter}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-14 w-full items-end rounded-sm bg-slab">
              <div className="w-full rounded-sm" style={{ height: `${height}%`, background: day.value === 0 ? `${color}33` : color }} />
            </div>
            <span className="text-[11px] font-medium leading-none text-asphalt-500">{day.letter}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OverviewVisuals({ docs, activity }: { docs: Doc[] | null; activity: ReactNode }) {
  const [range, setRange] = useState<RangeId>("month");
  const [hover, setHover] = useState<number | null>(null);
  const list = docs ?? [];
  const weekBuckets = currentWeek();
  const weekSeries = seriesFor(list, weekBuckets);
  const buckets = buildBuckets(range, list);
  const series = seriesFor(list, buckets);
  const grand = series.reduce((s, row) => s + row.total, 0);
  const rawPeak = Math.max(...series.flatMap((row) => row.values), 0);
  const peak = rawPeak === 0 ? 1 : niceMax(rawPeak);
  const showDots = buckets.length <= 12;

  function move(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VB_W;
    const plotX = x - PAD_L;
    if (plotX < 0 || plotX > PLOT_W || buckets.length === 0) {
      setHover(null);
      return;
    }
    const i = buckets.length === 1 ? 0 : Math.round((plotX / PLOT_W) * (buckets.length - 1));
    setHover(Math.max(0, Math.min(buckets.length - 1, i)));
  }

  const hoverX = hover == null ? 0 : PAD_L + (buckets.length === 1 ? PLOT_W / 2 : (hover / (buckets.length - 1)) * PLOT_W);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {series.map((row) => {
          const Icon = row.icon;
          const pct = grand > 0 ? Math.round((row.total / grand) * 100) : 0;
          return (
            <article key={row.key} className="overflow-hidden rounded-lg border border-asphalt-700/15 bg-white">
              <div className="h-1.5" style={{ background: row.color }} />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md text-white" style={{ background: row.color }}>
                    <Icon size={18} />
                  </span>
                  <span className="font-display text-3xl font-bold leading-none" style={{ color: row.color }}>{pct}%</span>
                </div>
                <div className="mt-4 text-sm font-medium text-asphalt-500">{row.label}</div>
                <div className="font-display text-4xl font-bold leading-none">{money(row.total)}</div>
                <div className="mt-1 text-xs text-asphalt-500">{row.count} {row.short}</div>
                <WeekBars
                  color={row.color}
                  days={(weekSeries.find((week) => week.key === row.key)?.values ?? []).map((value, i) => ({ letter: weekBuckets[i].label, value }))}
                />
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slab-dark">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                </div>
                <div className="mt-1 text-[11px] text-asphalt-500">{pct}% of billing</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <section className="panel min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Billing activity</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-asphalt-700">
              {series.map((row) => (
                <span key={row.key} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} /> {row.label}
                </span>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Chart range" className="flex rounded-md border border-asphalt-700/20 p-0.5">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={range === item.id}
                onClick={() => { setRange(item.id); setHover(null); }}
                className={`rounded px-2.5 py-1.5 text-xs font-semibold ${range === item.id ? "bg-navy text-white" : "text-asphalt-700 hover:bg-slab"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-56 w-full font-body"
            role="img"
            aria-label={`Billing activity for ${RANGES.find((r) => r.id === range)?.label}`}
            onMouseMove={move}
            onMouseLeave={() => setHover(null)}
          >
            {[0, 0.5, 1].map((step) => {
              const y = PAD_T + PLOT_H - step * PLOT_H;
              const value = rawPeak === 0 ? 0 : peak * step;
              return (
                <g key={step}>
                  <line x1={PAD_L} x2={VB_W - PAD_R} y1={y} y2={y} stroke="#e6e9ee" strokeWidth="1" />
                  {(rawPeak > 0 || step === 0) && <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#5c6570">{compact(value)}</text>}
                </g>
              );
            })}
            {series.map((row) => (
              <path key={row.key} d={linePath(row.values, peak)} fill="none" stroke={row.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {showDots && series.map((row) => row.values.map((v, i) => {
              const x = PAD_L + (buckets.length === 1 ? PLOT_W / 2 : (i / (buckets.length - 1)) * PLOT_W);
              const y = PAD_T + PLOT_H - (v / peak) * PLOT_H;
              return <circle key={`${row.key}-${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill={row.color} />;
            }))}
            {hover != null && (
              <line x1={hoverX} x2={hoverX} y1={PAD_T} y2={PAD_T + PLOT_H} stroke="#0b2c6b" strokeDasharray="3 3" strokeWidth="1" />
            )}
            {buckets.map((b, i) => {
              if (!b.label) return null;
              const x = PAD_L + (buckets.length === 1 ? PLOT_W / 2 : (i / (buckets.length - 1)) * PLOT_W);
              return <text key={`${b.start}-${i}`} x={x} y={VB_H - 8} textAnchor="middle" fontSize="11" fill="#5c6570">{b.label}</text>;
            })}
          </svg>
          {hover != null && (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-md border border-asphalt-700/15 bg-white px-3 py-2 text-xs shadow-sm"
              style={{ left: `${(hoverX / VB_W) * 100}%`, transform: hover > buckets.length / 2 ? "translateX(-110%)" : "translateX(8px)" }}
            >
              <div className="mb-1 font-semibold">{buckets[hover].label || new Date(buckets[hover].start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              {series.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-asphalt-700"><span className="h-2 w-2 rounded-full" style={{ background: row.color }} />{row.label}</span>
                  <span className="font-semibold">{money(row.values[hover])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="min-w-0">{activity}</div>
      </div>
    </>
  );
}
