"use client";

import { useCallback, useEffect, useState } from "react";

// ---- types mirroring the API responses ----
type Nutrients = {
  calories: number;
  proteinG: number;
  carbG: number;
  sugarG: number;
  fatG: number;
  satFatG: number;
  fiberG: number;
  ironMg: number;
  calciumMg: number;
  b12Ug: number;
  folateUg: number;
  sodiumMg: number;
  potassiumMg: number;
  glycemicLoad: number;
  addedFatG: number;
};
type Flag = { key: string; label: string; level: "good" | "watch" | "high"; detail: string };
type Item = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  grams: number;
  source: string;
  confidence: number;
  nutrients: Nutrients;
};
type Meal = {
  id: string;
  eatenAt: string;
  mealType: string;
  rawText: string | null;
  items: Item[];
  nutrients: Nutrients;
  flags: Flag[];
  score: number;
};
type Targets = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  sodiumMaxMg: number;
  addedSugarMaxG: number;
};
type Day = {
  date: string;
  meals: Meal[];
  totals: Nutrients;
  targets: Targets;
  flags: Flag[];
};
type DayFitLine = {
  key: string;
  label: string;
  unit: string;
  consumed: number;
  meal: number;
  target: number;
  afterPct: number;
  status: "under" | "on-track" | "over";
};
type Card = {
  score: number;
  band: "good" | "moderate" | "poor";
  verdict: string;
  benefits: string[];
  concerns: string[];
  adjustments: string[];
  dayFit: DayFitLine[];
};
type AssessResponse = {
  ok: boolean;
  parsedWithLlm: boolean;
  items: { label: string; matchedName: string | null; grams: number; source: string }[];
  mealNutrients: Nutrients;
  card: Card;
};

const LEVEL_STYLES: Record<Flag["level"], string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  watch: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-rose-100 text-rose-800 border-rose-200",
};
const BAND_COLOR: Record<Card["band"], string> = {
  good: "text-emerald-600",
  moderate: "text-amber-600",
  poor: "text-rose-600",
};

function FlagPill({ f }: { f: Flag }) {
  return (
    <span
      title={f.detail}
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[f.level]}`}
    >
      {f.label}
    </span>
  );
}

function Bar({
  label,
  value,
  target,
  unit,
  overIsBad,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  overIsBad: boolean;
}) {
  const pct = target > 0 ? Math.min(150, Math.round((value / target) * 100)) : 0;
  const over = overIsBad ? pct > 105 : false;
  const under = !overIsBad && pct < 80;
  const color = over ? "bg-rose-500" : under ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-600">
        <span className="font-medium text-stone-800">{label}</span>
        <span>
          {Math.round(value)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [day, setDay] = useState<Day | null>(null);
  const [logText, setLogText] = useState("");
  const [assessText, setAssessText] = useState("");
  const [logging, setLogging] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<AssessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async () => {
    const res = await fetch("/api/day");
    const data = await res.json();
    if (data.ok) setDay(data);
  }, []);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  async function submitLog() {
    if (!logText.trim()) return;
    setLogging(true);
    setError(null);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: logText }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setLogText("");
      await loadDay();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to log");
    } finally {
      setLogging(false);
    }
  }

  async function submitAssess() {
    if (!assessText.trim()) return;
    setAssessing(true);
    setError(null);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: assessText }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAssessment(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to assess");
    } finally {
      setAssessing(false);
    }
  }

  async function deleteMeal(id: string) {
    await fetch(`/api/meal/${id}`, { method: "DELETE" });
    await loadDay();
  }

  const t = day?.targets;
  const tot = day?.totals;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          masala<span className="text-orange-600">Macros</span>
        </h1>
        <p className="text-sm text-stone-500">
          Your personal dietitian — Indian-first nutrition tracking & pre-eat assessment
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---- Left: log + assess ---- */}
        <section className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold">Log a meal</h2>
            <p className="mb-3 text-xs text-stone-500">
              Describe it naturally, e.g. &ldquo;2 phulkas, a katori of dal tadka and aloo gobi&rdquo;.
            </p>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              rows={3}
              placeholder="What did you eat?"
              className="w-full resize-none rounded-lg border border-stone-300 p-3 text-sm outline-none focus:border-orange-400"
            />
            <button
              onClick={submitLog}
              disabled={logging}
              className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {logging ? "Logging…" : "Log meal"}
            </button>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold">Before I eat — assess</h2>
            <p className="mb-3 text-xs text-stone-500">
              Check a meal before eating. Judged against what you&rsquo;ve had today.
            </p>
            <textarea
              value={assessText}
              onChange={(e) => setAssessText(e.target.value)}
              rows={3}
              placeholder="What are you about to eat?"
              className="w-full resize-none rounded-lg border border-stone-300 p-3 text-sm outline-none focus:border-orange-400"
            />
            <button
              onClick={submitAssess}
              disabled={assessing}
              className="mt-3 rounded-lg border border-orange-600 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              {assessing ? "Assessing…" : "Assess"}
            </button>

            {assessment && <AssessmentView a={assessment} />}
          </div>
        </section>

        {/* ---- Right: day summary + timeline ---- */}
        <section className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">Today</h2>
              <span className="text-xs text-stone-500">{day?.date}</span>
            </div>
            {t && tot ? (
              <div className="space-y-3">
                <Bar label="Calories" value={tot.calories} target={t.calories} unit="kcal" overIsBad />
                <Bar label="Protein" value={tot.proteinG} target={t.proteinG} unit="g" overIsBad={false} />
                <Bar label="Carbs" value={tot.carbG} target={t.carbG} unit="g" overIsBad />
                <Bar label="Fat" value={tot.fatG} target={t.fatG} unit="g" overIsBad />
                <Bar label="Fibre" value={tot.fiberG} target={t.fiberG} unit="g" overIsBad={false} />
                <Bar label="Sodium" value={tot.sodiumMg} target={t.sodiumMaxMg} unit="mg" overIsBad />
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="mr-1 text-xs text-stone-500">
                    Glycemic load ~{Math.round(tot.glycemicLoad)}
                  </span>
                  {day.flags.map((f) => (
                    <FlagPill key={f.key} f={f} />
                  ))}
                </div>
                <p className="pt-1 text-xs text-stone-500">
                  {Math.max(0, Math.round(t.calories - tot.calories))} kcal remaining in today&rsquo;s
                  budget.
                </p>
              </div>
            ) : (
              <p className="text-sm text-stone-500">Loading…</p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Meals</h2>
            {day && day.meals.length === 0 && (
              <p className="text-sm text-stone-500">No meals logged yet today.</p>
            )}
            {day?.meals.map((m) => (
              <MealView key={m.id} m={m} onDelete={() => deleteMeal(m.id)} />
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-10 text-center text-xs text-stone-400">
        Nutrient values are curated approximations (IFCT/USDA-derived) — refine with exact data over
        time.
      </footer>
    </main>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-600";
}

function MealView({ m, onDelete }: { m: Meal; onDelete: () => void }) {
  const time = new Date(m.eatenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-orange-600">
            {m.mealType}
          </span>
          <span className="ml-2 text-xs text-stone-400">{time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${scoreColor(m.score)}`}>{m.score}/100</span>
          <button
            onClick={onDelete}
            className="text-xs text-stone-400 hover:text-rose-600"
            title="Delete meal"
          >
            ✕
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1 text-sm">
        {m.items.map((it) => (
          <li key={it.id} className="flex justify-between">
            <span>
              {it.quantity} {it.unit} {it.label}
              {it.source === "ai-estimated" && (
                <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">est</span>
              )}
            </span>
            <span className="text-stone-500">{Math.round(it.nutrients.calories)} kcal</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
        <span>{Math.round(m.nutrients.calories)} kcal</span>
        <span>P {Math.round(m.nutrients.proteinG)}g</span>
        <span>C {Math.round(m.nutrients.carbG)}g</span>
        <span>F {Math.round(m.nutrients.fatG)}g</span>
        <span>Fib {Math.round(m.nutrients.fiberG)}g</span>
        <span>GL ~{Math.round(m.nutrients.glycemicLoad)}</span>
      </div>

      {m.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {m.flags.map((f) => (
            <FlagPill key={f.key} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentView({ a }: { a: AssessResponse }) {
  const c = a.card;
  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-bold ${BAND_COLOR[c.band]}`}>{c.score}</span>
        <span className="text-xs uppercase tracking-wide text-stone-500">{c.band}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-stone-800">{c.verdict}</p>

      <div className="mt-2 text-xs text-stone-500">
        Parsed: {a.items.map((i) => i.label).join(", ")}
        {!a.parsedWithLlm && (
          <span className="ml-1">(heuristic parse — set ANTHROPIC_API_KEY for best results)</span>
        )}
      </div>

      {c.benefits.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-emerald-700">Benefits</p>
          <ul className="ml-4 list-disc text-xs text-stone-700">
            {c.benefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {c.concerns.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-rose-700">Concerns</p>
          <ul className="ml-4 list-disc text-xs text-stone-700">
            {c.concerns.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-2">
        <p className="text-xs font-semibold text-orange-700">Adjustments</p>
        <ul className="ml-4 list-disc text-xs text-stone-700">
          {c.adjustments.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-stone-200 pt-2">
        <p className="mb-1 text-xs font-semibold text-stone-600">Fit against today</p>
        <div className="space-y-1">
          {c.dayFit.map((l) => (
            <div key={l.key} className="flex justify-between text-xs">
              <span className="text-stone-600">{l.label}</span>
              <span
                className={
                  l.status === "over"
                    ? "text-rose-600"
                    : l.status === "under"
                      ? "text-amber-600"
                      : "text-emerald-600"
                }
              >
                {l.consumed} + {l.meal} / {l.target} {l.unit} ({l.afterPct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
