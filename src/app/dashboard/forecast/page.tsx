'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthlyData {
  month: string;
  revenue: number;
  label: string;
}

interface DailyData {
  day: string;
  revenue: number;
  forecast: number | null;
  upper: number | null;
  lower: number | null;
}

interface SourceBreakdown {
  source: string;
  actual: number;
  forecast: number;
  color: string;
}

interface ScenarioResult {
  label: string;
  revenue: number;
  delta: number;
}

// ---------------------------------------------------------------------------
// Helpers – simple linear regression
// ---------------------------------------------------------------------------

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function predict(slope: number, intercept: number, x: number) {
  return slope * x + intercept;
}

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function generateMonthlyData(): MonthlyData[] {
  const base = 42000;
  const growth = 2200;
  const seasonality = [0, -0.04, 0.02, 0.06, 0.12, 0.14, 0.10, 0.08, 0.06, 0.04, -0.02, -0.06];
  return MONTHS.map((m, i) => {
    const noise = (Math.sin(i * 3.7) * 0.05);
    const rev = base + growth * i + base * seasonality[i] + base * noise;
    return { month: m, revenue: Math.round(rev), label: m };
  });
}

function generateDailyData(): DailyData[] {
  const data: DailyData[] = [];
  const today = 19;
  for (let d = 1; d <= 31; d++) {
    const base = 1600 + (d - 1) * 45;
    const noise = Math.sin(d * 2.3) * 120;
    const actual = d <= today ? Math.round(base + noise) : 0;
    const forecastVal = d > today - 3 ? Math.round(base + noise * 0.3) : null;
    const upper = forecastVal ? Math.round(forecastVal * 1.12) : null;
    const lower = forecastVal ? Math.round(forecastVal * 0.88) : null;
    data.push({ day: `Day ${d}`, revenue: actual, forecast: forecastVal, upper, lower });
  }
  return data;
}

function generateSourceBreakdown(): SourceBreakdown[] {
  return [
    { source: 'Roadside Assistance', actual: 18200, forecast: 20100, color: '#635BFF' },
    { source: 'Insurance Referrals', actual: 9800, forecast: 11200, color: '#0A2540' },
    { source: 'Direct App Bookings', actual: 7400, forecast: 8900, color: '#00D4AA' },
    { source: 'Fleet Contracts', actual: 5200, forecast: 5800, color: '#80E9FF' },
    { source: 'Walk-in / Other', actual: 3100, forecast: 3400, color: '#FF7A2F' },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForecastPage() {
  const [drivers, setDrivers] = useState(12);
  const monthlyData = useMemo(() => generateMonthlyData(), []);
  const dailyData = useMemo(() => generateDailyData(), []);
  const sourceBreakdown = useMemo(() => generateSourceBreakdown(), []);

  // Current month index (July = 6)
  const currentMonth = 6;
  const currentMonthData = monthlyData[currentMonth];
  const lastMonthData = monthlyData[currentMonth - 1];
  const sameMonthLastYear = monthlyData[currentMonth]; // In real app, compare to prior year

  // Linear regression on historical months
  const histX = monthlyData.slice(0, currentMonth).map((_, i) => i);
  const histY = monthlyData.slice(0, currentMonth).map((d) => d.revenue);
  const { slope, intercept } = linearRegression(histX, histY);

  // 3-month forecast
  const forecastMonths = [currentMonth, currentMonth + 1, currentMonth + 2];
  const forecastData = forecastMonths.map((idx) => {
    const base = predict(slope, intercept, idx);
    return {
      label: MONTHS[idx] || `M${idx + 1}`,
      predicted: Math.round(base),
      lower: Math.round(base * 0.88),
      upper: Math.round(base * 1.12),
    };
  });

  // Bar chart: actual vs forecast for current month
  const currentVsForecast = [
    { name: MONTHS[currentMonth], actual: currentMonthData.revenue, forecast: forecastData[0].predicted },
  ];

  // Alert
  const target = forecastData[0].predicted;
  const progress = currentMonthData.revenue;
  const daysInMonth = 31;
  const daysPassed = 19;
  const projectedMonthEnd = Math.round((progress / daysPassed) * daysInMonth);
  const alertOnTrack = projectedMonthEnd >= target;
  const alertDiff = alertOnTrack
    ? Math.round(((projectedMonthEnd - target) / target) * 100)
    : Math.round(((target - projectedMonthEnd) / target) * 100);

  // YoY comparison
  const yoyGrowth = 14.2;

  // Forecast accuracy (last month)
  const lastMonthPredicted = 49800;
  const lastMonthActual = 51200;
  const accuracy = Math.round((1 - Math.abs(lastMonthActual - lastMonthPredicted) / lastMonthActual) * 100);

  // Scenario calculator
  const revenuePerDriver = Math.round(currentMonthData.revenue / 12);
  const scenarioResults: ScenarioResult[] = useMemo(() => {
    return [0, 5, 10, 15, 20].map((extra) => {
      const totalDrivers = 12 + extra;
      const predicted = Math.round(revenuePerDriver * totalDrivers);
      return {
        label: `${totalDrivers} drivers`,
        revenue: predicted,
        delta: predicted - currentMonthData.revenue,
      };
    });
  }, [currentMonthData.revenue, revenuePerDriver]);

  const selectedScenario = scenarioResults.find((s) => s.label === `${drivers} drivers`) || scenarioResults[1];

  // Key assumptions
  const monthlyGrowthRate = ((slope / intercept) * 100).toFixed(1);
  const avgSeasonality = '±8%';
  const newCustomerRate = '4.2/mo';

  // Daily trend with forecast extension
  const dailyTrendData = dailyData.map((d, i) => ({
    day: i + 1,
    actual: d.revenue || undefined,
    forecast: d.forecast || undefined,
    upper: d.upper || undefined,
    lower: d.lower || undefined,
  }));

  return (
    <div style={{ minHeight: '100vh', background: '#F6F9FC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0A2540', padding: '28px 40px' }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Revenue Forecasting</h1>
        <p style={{ color: '#ADBDCC', margin: '6px 0 0', fontSize: 14 }}>
          Predictive revenue analysis based on historical trends &bull; July 2026
        </p>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 40px 60px' }}>
        {/* Alert banner */}
        <div
          style={{
            background: alertOnTrack ? '#E8F8F0' : '#FEF3E8',
            border: `1px solid ${alertOnTrack ? '#00D4AA' : '#FF7A2F'}`,
            borderRadius: 8,
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>{alertOnTrack ? '✓' : '⚠'}</span>
          <div>
            <div style={{ fontWeight: 600, color: '#0A2540', fontSize: 15 }}>
              {alertOnTrack
                ? `On track for $${projectedMonthEnd.toLocaleString()} this month`
                : `Below target by ${alertDiff}%`}
            </div>
            <div style={{ fontSize: 13, color: '#425466', marginTop: 2 }}>
              {daysPassed} of {daysInMonth} days elapsed &bull; Target: ${target.toLocaleString()} &bull; Projected end-of-month: ${projectedMonthEnd.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Current Month Revenue', value: `$${currentMonthData.revenue.toLocaleString()}`, sub: `${MONTHS[currentMonth]} actual` },
            { label: 'Month Forecast', value: `$${forecastData[0].predicted.toLocaleString()}`, sub: `Range: $${forecastData[0].lower.toLocaleString()} – $${forecastData[0].upper.toLocaleString()}` },
            { label: 'YoY Growth', value: `+${yoyGrowth}%`, sub: `${MONTHS[currentMonth]} 2025 → ${MONTHS[currentMonth]} 2026` },
            { label: 'Forecast Accuracy', value: `${accuracy}%`, sub: `Last month: predicted $${lastMonthPredicted.toLocaleString()}, actual $${lastMonthActual.toLocaleString()}` },
          ].map((kpi, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '18px 20px', border: '1px solid #E3E8EE' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8898AA', textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0A2540', marginTop: 6 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: '#425466', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1: current vs forecast + 3-month forecast */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Current month bar chart */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>Current Month: Actual vs Forecast</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[...monthlyData.slice(0, currentMonth + 1).map((d) => ({ name: d.month, actual: d.revenue, forecast: null })), { name: MONTHS[currentMonth] + ' (Fcst)', actual: null, forecast: forecastData[0].predicted }]} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#425466' }} />
                <YAxis tick={{ fontSize: 11, fill: '#425466' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E3E8EE' }} />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#635BFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecast" name="Forecast" fill="#80E9FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3-month forecast */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>3-Month Forecast with Confidence Range</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={forecastData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#425466' }} />
                <YAxis tick={{ fontSize: 11, fill: '#425466' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E3E8EE' }} />
                <Legend />
                <Bar dataKey="lower" name="Lower Bound" fill="#E3E8EE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" name="Predicted" fill="#635BFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="upper" name="Upper Bound" fill="#C4F0E7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {forecastData.map((f) => (
                <div key={f.label} style={{ textAlign: 'center', fontSize: 12, color: '#425466' }}>
                  <strong>{f.label}:</strong> ${(f.predicted / 1000).toFixed(1)}k
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily trend line chart */}
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>Daily Revenue Trend with Forecast Extension</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#425466' }} label={{ value: 'Day of Month', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#8898AA' }} />
              <YAxis tick={{ fontSize: 11, fill: '#425466' }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E3E8EE' }} />
              <Legend />
              <Area dataKey="upper" name="Upper CI" fill="#E8F8F0" stroke="none" fillOpacity={0.5} />
              <Area dataKey="lower" name="Lower CI" fill="#FEF3E8" stroke="none" fillOpacity={0.3} />
              <Line dataKey="actual" name="Actual" stroke="#635BFF" strokeWidth={2} dot={{ r: 2, fill: '#635BFF' }} connectNulls={false} />
              <Line dataKey="forecast" name="Forecast" stroke="#FF7A2F" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2, fill: '#FF7A2F' }} connectNulls={false} />
              <ReferenceLine x={19} stroke="#0A2540" strokeDasharray="4 4" label={{ value: 'Today', position: 'top', fontSize: 11, fill: '#0A2540' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Source breakdown + Scenario calculator + Assumptions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Revenue by source */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>Revenue by Source – Actual vs Forecast</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sourceBreakdown} layout="vertical" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#425466' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: '#425466' }} width={140} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E3E8EE' }} />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#635BFF" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="forecast" name="Forecast" fill="#80E9FF" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario calculator + Assumptions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Scenario calculator */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE', flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 12px' }}>Scenario Calculator</h3>
              <p style={{ fontSize: 13, color: '#425466', margin: '0 0 12px' }}>
                &ldquo;What if we add more drivers?&rdquo; &bull; Revenue per driver: <strong>${revenuePerDriver.toLocaleString()}/mo</strong>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#0A2540', fontWeight: 500 }}>Drivers:</label>
                <input
                  type="range"
                  min={12}
                  max={32}
                  value={drivers}
                  onChange={(e) => setDrivers(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#635BFF' }}
                />
                <span style={{ fontSize: 18, fontWeight: 700, color: '#635BFF', minWidth: 30, textAlign: 'center' }}>{drivers}</span>
              </div>
              <div style={{ background: '#F6F9FC', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8898AA', fontWeight: 600, textTransform: 'uppercase' }}>Projected Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', marginTop: 4 }}>
                    ${(revenuePerDriver * drivers).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#8898AA', fontWeight: 600, textTransform: 'uppercase' }}>vs. Current</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: selectedScenario.delta >= 0 ? '#00D4AA' : '#DF1B41', marginTop: 4 }}>
                    {selectedScenario.delta >= 0 ? '+' : ''}${selectedScenario.delta.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
                {scenarioResults.map((s, i) => {
                  const isSelected = s.label === `${drivers} drivers`;
                  return (
                    <button
                      key={i}
                      onClick={() => setDrivers(12 + i * 5)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? '#635BFF' : '#E3E8EE'}`,
                        background: isSelected ? '#F0EEFF' : '#fff',
                        color: '#0A2540',
                        fontSize: 11,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key assumptions */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 12px' }}>Key Assumptions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Monthly Growth', value: `+${monthlyGrowthRate}%`, icon: '📈' },
                  { label: 'Seasonality', value: avgSeasonality, icon: '🔄' },
                  { label: 'New Customers', value: newCustomerRate, icon: '👥' },
                ].map((a, i) => (
                  <div key={i} style={{ background: '#F6F9FC', borderRadius: 6, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20 }}>{a.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0A2540', marginTop: 4 }}>{a.value}</div>
                    <div style={{ fontSize: 11, color: '#8898AA', marginTop: 2 }}>{a.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* YoY Comparison + Forecast Accuracy */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* YoY Comparison */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>Year-over-Year Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData.map((d, i) => ({
                month: d.month,
                thisYear: d.revenue,
                lastYear: Math.round(d.revenue / (1 + yoyGrowth / 100)),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#425466' }} />
                <YAxis tick={{ fontSize: 11, fill: '#425466' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E3E8EE' }} />
                <Legend />
                <Bar dataKey="lastYear" name="2025" fill="#E3E8EE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="thisYear" name="2026" fill="#635BFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Accuracy Tracker */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #E3E8EE' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', margin: '0 0 16px' }}>Forecast Accuracy Tracker</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              {/* Circular indicator */}
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E3E8EE" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={accuracy >= 90 ? '#00D4AA' : accuracy >= 80 ? '#FF7A2F' : '#DF1B41'}
                    strokeWidth="8"
                    strokeDasharray={`${(accuracy / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: '#0A2540' }}>
                  {accuracy}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A2540' }}>Last Month's Prediction</div>
                <div style={{ fontSize: 13, color: '#425466', marginTop: 4 }}>
                  Predicted: <strong>${lastMonthPredicted.toLocaleString()}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#425466' }}>
                  Actual: <strong>${lastMonthActual.toLocaleString()}</strong>
                </div>
                <div style={{ fontSize: 13, color: accuracy >= 90 ? '#00D4AA' : '#FF7A2F', fontWeight: 600, marginTop: 4 }}>
                  {accuracy >= 90 ? '● Excellent accuracy' : accuracy >= 80 ? '● Good accuracy' : '● Needs improvement'}
                </div>
              </div>
            </div>

            {/* Historical accuracy table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E3E8EE' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: '#8898AA', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Month</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#8898AA', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Predicted</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#8898AA', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#8898AA', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { month: 'Jun', predicted: 53200, actual: 51200 },
                  { month: 'May', predicted: 48900, actual: 50100 },
                  { month: 'Apr', predicted: 46100, actual: 45800 },
                ].map((row) => {
                  const err = ((Math.abs(row.actual - row.predicted) / row.actual) * 100).toFixed(1);
                  return (
                    <tr key={row.month} style={{ borderBottom: '1px solid #F6F9FC' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 500 }}>{row.month}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>${row.predicted.toLocaleString()}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>${row.actual.toLocaleString()}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: parseFloat(err) < 4 ? '#00D4AA' : '#FF7A2F', fontWeight: 600 }}>
                        {err}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
