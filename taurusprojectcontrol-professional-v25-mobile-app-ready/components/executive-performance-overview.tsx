"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { ProgressGauge } from "@/components/progress-gauge";
import { ScurveChart } from "@/components/scurve-chart";
import { useLanguage } from "@/components/language-provider";
import { progressPerformance, signalLabel } from "@/lib/progress-metrics";
import { DISCIPLINE_ORDER, MONTHLY_SUBDISCIPLINES, WEEKLY_SUBDISCIPLINES } from "@/lib/progress-structure";
import type { CurvePoint, ProgressSeriesPoint } from "@/lib/types";

type Frequency = "monthly" | "weekly";

function curveFor(points: ProgressSeriesPoint[]): CurvePoint[] {
  const byDate = new Map<string, CurvePoint>();
  for (const point of points) {
    const entry = byDate.get(point.periodDate) ?? { date: point.periodDate, baseline: null, planned: null, actual: null };
    if (point.measure === "baseline" || point.measure === "actual") {
      const value = point.cumulativeValue ?? point.incrementalValue;
      if (value !== null) entry[point.measure] = value;
    }
    byDate.set(point.periodDate, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function orderedUnique(values: string[], preferred: readonly string[] = []) {
  const unique = Array.from(new Set(values.filter(Boolean)));
  return unique.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });
}

function forecastDays(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value} days`;
}

function MobileExecutiveCurve({ points }: { points: CurvePoint[] }) {
  const source = points.length > 14
    ? points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 12) === 0)
    : points;
  if (!source.length) return <div className="mobile-chart-empty">No progress curve is available.</div>;

  const width = 360;
  const height = 242;
  const left = 36;
  const right = 10;
  const top = 15;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const times = source.map((point) => Date.parse(`${point.date}T00:00:00Z`));
  const minimum = Math.min(...times);
  const span = Math.max(1, Math.max(...times) - minimum);
  const x = (index: number) => left + ((times[index] - minimum) / span) * plotWidth;
  const y = (value: number) => top + (1 - Math.max(0, Math.min(1, value))) * plotHeight;
  const pointsFor = (key: "baseline" | "actual") => source.flatMap((point, index) => point[key] === null ? [] : [`${x(index).toFixed(1)},${y(point[key]!).toFixed(1)}`]).join(" ");
  const labelIndexes = Array.from(new Set([0, Math.floor((source.length - 1) / 3), Math.floor(((source.length - 1) * 2) / 3), source.length - 1]));

  return (
    <div className="mobile-progress-chart">
      <div className="mobile-chart-legend"><span><i className="actual" />Actual</span><span><i className="planned" />Planned</span></div>
      <svg aria-label="Overall progress S-curve" role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, .2, .4, .6, .8, 1].map((tick) => <g key={tick}><line className="mobile-chart-grid" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} /><text className="mobile-chart-y" textAnchor="end" x={left - 7} y={y(tick) + 4}>{Math.round(tick * 100)}%</text></g>)}
        <polyline className="mobile-chart-planned" fill="none" points={pointsFor("baseline")} />
        <polyline className="mobile-chart-actual" fill="none" points={pointsFor("actual")} />
        {source.map((point, index) => point.baseline === null ? null : <circle className="mobile-planned-dot" cx={x(index)} cy={y(point.baseline)} key={`b-${point.date}`} r="2.6" />)}
        {source.map((point, index) => point.actual === null ? null : <circle className="mobile-actual-dot" cx={x(index)} cy={y(point.actual)} key={`a-${point.date}`} r="3" />)}
        {labelIndexes.map((index) => <text className="mobile-chart-x" key={source[index].date} textAnchor={index === 0 ? "start" : index === source.length - 1 ? "end" : "middle"} x={x(index)} y={height - 18}>{new Date(`${source[index].date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</text>)}
        <text className="mobile-chart-axis-title" textAnchor="middle" x={left + plotWidth / 2} y={height - 1}>Week Ending</text>
      </svg>
    </div>
  );
}

export function ExecutivePerformanceOverview({
  fallbackCurve,
  progressSeries,
  totalDocuments,
  approvedDocuments,
  criticalActivities,
  scheduleActivities
}: {
  fallbackCurve: CurvePoint[];
  progressSeries: ProgressSeriesPoint[];
  totalDocuments: number;
  approvedDocuments: number;
  criticalActivities: number;
  scheduleActivities: number;
}) {
  const { locale, t } = useLanguage();
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [disciplineChoice, setDisciplineChoice] = useState("Overall");
  const [subdisciplineChoice, setSubdisciplineChoice] = useState("__all__");

  const frequencyPoints = useMemo(
    () => progressSeries.filter((point) => point.frequency === frequency),
    [progressSeries, frequency]
  );

  const preferredDisciplines = frequency === "weekly"
    ? ["Overall", "Engineering", "Construction"]
    : [...DISCIPLINE_ORDER];

  const disciplines = useMemo(
    () => orderedUnique([...preferredDisciplines, ...frequencyPoints.map((point) => point.discipline)], preferredDisciplines),
    [frequencyPoints, frequency]
  );

  const discipline = disciplines.includes(disciplineChoice)
    ? disciplineChoice
    : (disciplines.includes("Overall") ? "Overall" : disciplines[0] ?? "Overall");

  const disciplinePoints = useMemo(
    () => frequencyPoints.filter((point) => point.discipline === discipline),
    [frequencyPoints, discipline]
  );

  const preferredSubs = frequency === "weekly"
    ? WEEKLY_SUBDISCIPLINES[discipline] ?? []
    : MONTHLY_SUBDISCIPLINES[discipline] ?? [];

  const subdisciplines = useMemo(
    () => orderedUnique(
      [
        ...preferredSubs,
        ...disciplinePoints.map((point) => point.subdiscipline).filter((value): value is string => Boolean(value))
      ],
      preferredSubs
    ),
    [disciplinePoints, discipline, frequency]
  );

  const subdiscipline = subdisciplineChoice === "__all__" || subdisciplines.includes(subdisciplineChoice)
    ? subdisciplineChoice
    : "__all__";

  const selectedPoints = useMemo(
    () => disciplinePoints.filter((point) => subdiscipline === "__all__" ? point.subdiscipline === null : point.subdiscipline === subdiscipline),
    [disciplinePoints, subdiscipline]
  );

  const selectedCurve = useMemo(() => curveFor(selectedPoints), [selectedPoints]);
  const curve = selectedCurve.length
    ? selectedCurve
    : (frequency === "monthly" && discipline === "Overall" && subdiscipline === "__all__" ? fallbackCurve : []);

  const performance = progressPerformance(curve);
  const signal = signalLabel(performance.signal);
  const dateLocale = locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : "en-GB";
  const date = (value: string | null) => value
    ? new Date(`${value}T00:00:00Z`).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : t("Pending");
  const structureCount = useMemo(() => new Set(progressSeries.map((point) => [point.frequency, point.discipline, point.subdiscipline ?? ""].join("|"))).size, [progressSeries]);
  const selectionTitle = discipline === "Overall"
    ? t("Overall — Total")
    : subdiscipline === "__all__"
      ? `${t(discipline)} — ${t("Total")}`
      : `${t(discipline)} — ${t(subdiscipline)}`;

  function changeFrequency(next: Frequency) {
    setFrequency(next);
    setSubdisciplineChoice("__all__");
    if (next === "weekly" && !["Overall", "Engineering", "Construction"].includes(disciplineChoice)) setDisciplineChoice("Overall");
  }

  return (
    <>
      <section className="mobile-executive-dashboard">
        <div className="mobile-kpi-grid">
          <article className="mobile-kpi-card mobile-kpi-actual"><span>Actual</span><strong>{performance.actual === null ? "—" : `${(performance.actual * 100).toFixed(1)}%`}</strong></article>
          <article className="mobile-kpi-card"><span>Planned</span><strong>{performance.baseline === null ? "—" : `${(performance.baseline * 100).toFixed(2)}%`}</strong></article>
          <article className="mobile-kpi-card mobile-kpi-spi"><span>SPI</span><strong>{performance.spi === null ? "—" : performance.spi.toFixed(2)}</strong></article>
          <article className={`mobile-kpi-card ${(performance.sv ?? 0) < 0 ? "mobile-kpi-negative" : "mobile-kpi-positive"}`}><span>SV</span><strong>{performance.sv === null ? "—" : `${performance.sv >= 0 ? "+" : ""}${(performance.sv * 100).toFixed(1)}%`}</strong></article>
        </div>
        <article className="mobile-app-panel mobile-overall-panel">
          <h2>Overall Progress</h2>
          <MobileExecutiveCurve points={curve} />
        </article>
        <article className="mobile-app-panel mobile-project-status">
          <h2>Project Status</h2>
          <div className="mobile-status-row">
            <div className="mobile-data-date"><i aria-hidden="true">▦</i><span>Data Date<strong>{date(performance.dataDate)}</strong></span></div>
            <strong className={`mobile-status-badge signal-${performance.signal}`}>{performance.signal === "ahead" ? "AHEAD" : performance.signal === "on-plan" ? "ON TRACK" : performance.signal === "slightly-behind" ? "WATCH" : performance.signal === "delayed" ? "DELAYED" : "PENDING"}</strong>
          </div>
        </article>
      </section>

      <div className="desktop-executive-dashboard">
      <section className="executive-metric-grid">
        <ProgressGauge label="Actual progress" value={performance.actual} detail="Earned to data date" tone="green" />
        <ProgressGauge label="Baseline progress" value={performance.baseline} detail="Planned to data date" tone="blue" />
        <KpiCard label="SPI" value={performance.spi === null ? "—" : performance.spi.toFixed(3)} detail={performance.signal === "ahead" ? "Ahead of baseline" : t(signal)} tone={performance.signal === "ahead" ? "green" : performance.signal === "on-plan" ? "blue" : performance.signal === "slightly-behind" ? "amber" : "red"} />
        <KpiCard label="Schedule variance" value={performance.sv === null ? "—" : `${performance.sv >= 0 ? "+" : ""}${(performance.sv * 100).toFixed(2)} PP`} detail={performance.sv !== null && performance.sv >= 0 ? "Ahead of baseline" : "Behind baseline"} tone={(performance.sv ?? 0) >= 0 ? "green" : "red"} />
        <KpiCard label="Forecast finish" value={date(performance.expectedFinish)} detail={performance.baselineFinish ? `${t("Baseline")} ${date(performance.baselineFinish)}` : "Baseline-performance forecast"} tone="amber" />
        <KpiCard label="Controlled documents" value={totalDocuments.toLocaleString(dateLocale)} detail={`${approvedDocuments.toLocaleString(dateLocale)} ${t("Final Approved")}`} />
        <KpiCard label="Critical activities" value={criticalActivities.toLocaleString(dateLocale)} detail={`${t("of")} ${scheduleActivities.toLocaleString(dateLocale)} ${t("activities")}`} tone="red" />
      </section>

      <section className="dashboard-grid main-dashboard-grid executive-snapshot-main-grid">
        <article className="panel wide-panel executive-curve-panel">
          <div className="panel-heading executive-curve-heading">
            <div><span className="eyebrow">{t("PERFORMANCE CURVE")}</span><h2>{selectionTitle}</h2></div>
            <div className="segmented compact-segmented">
              <button className={frequency === "monthly" ? "selected" : ""} onClick={() => changeFrequency("monthly")} type="button">{t("Monthly")}</button>
              <button className={frequency === "weekly" ? "selected" : ""} onClick={() => changeFrequency("weekly")} type="button">{t("Weekly")}</button>
            </div>
          </div>

          <div className="executive-curve-controls" aria-label={t("Discipline") + " / " + t("Sub-discipline")}>
            <label>
              <span>{t("Discipline")}</span>
              <select value={discipline} onChange={(event) => { setDisciplineChoice(event.target.value); setSubdisciplineChoice("__all__"); }}>
                {disciplines.map((value) => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </label>
            <label>
              <span>{t("Sub-discipline")}</span>
              <select disabled={!subdisciplines.length} value={subdiscipline} onChange={(event) => setSubdisciplineChoice(event.target.value)}>
                <option value="__all__">{subdisciplines.length ? `${t(discipline)} — ${t("Total")}` : t("Overall total")}</option>
                {subdisciplines.map((value) => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </label>
            <div className="executive-curve-selection-chip">
              <span>{frequency === "weekly" ? t("Weekly") : t("Monthly")}</span>
              <strong>{selectionTitle}</strong>
            </div>
          </div>

          {curve.length ? <ScurveChart points={curve} granularity={frequency} /> : <div className="empty-curve-message"><strong>{t("No cumulative curve is available for this selection.")}</strong></div>}
        </article>
        <article className="panel insight-panel">
          <div className="panel-heading"><div><span className="eyebrow">{t("CONTROL STATUS")}</span><h2>{t("Management Signal")}</h2></div></div>
          <div className={`signal-card signal-${performance.signal}`}>
            <span>{t("SCHEDULE STATUS")}</span>
            <strong>{performance.signal === "ahead" ? t("Ahead of Baseline") : t(signal)}</strong>
            <p>SPI {performance.spi === null ? "—" : performance.spi.toFixed(3)} · SV {performance.sv === null ? "—" : `${performance.sv >= 0 ? "+" : ""}${(performance.sv * 100).toFixed(2)} PP`}</p>
          </div>
          <div className="metric-line"><span>{t("Baseline Position")}</span><strong>{performance.baseline === null ? "—" : `${(performance.baseline * 100).toFixed(2)}%`}</strong></div>
          <div className="metric-line"><span>{t("Actual Achieved")}</span><strong>{performance.actual === null ? "—" : `${(performance.actual * 100).toFixed(2)}%`}</strong></div>
          <div className="metric-line"><span>{t("Expected Finish")}</span><strong>{date(performance.expectedFinish)}</strong></div>
          <div className="metric-line"><span>{t("Forecast Variance")}</span><strong>{forecastDays(performance.finishVarianceDays)}</strong></div>
          <div className="data-quality"><i>✓</i><div><strong>{t("Workbook structure recognized")}</strong><span>{structureCount || 1} {t("controlled progress curves")}</span></div></div>
        </article>
      </section>
      </div>
    </>
  );
}
