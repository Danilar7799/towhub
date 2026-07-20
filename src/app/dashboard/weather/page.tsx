'use client'

import { useState } from 'react'

const tokens = {
  primary: '#533afd',
  text: '#061b31',
  muted: '#64748d',
  border: '#e5edf5',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBorder: '#bbf7d0',
  yellow: '#ca8a04',
  yellowBg: '#fefce8',
  yellowBorder: '#fef08a',
  orange: '#ea580c',
  orangeBg: '#fff7ed',
  orangeBorder: '#fed7aa',
  red: '#dc2626',
  redBg: '#fef2f2',
  redBorder: '#fecaca',
}

type DemandLevel = 'Low' | 'Medium' | 'High' | 'Extreme'

function demandColor(level: DemandLevel) {
  if (level === 'Low') return { color: tokens.green, bg: tokens.greenBg, border: tokens.greenBorder }
  if (level === 'Medium') return { color: tokens.yellow, bg: tokens.yellowBg, border: tokens.yellowBorder }
  if (level === 'High') return { color: tokens.orange, bg: tokens.orangeBg, border: tokens.orangeBorder }
  return { color: tokens.red, bg: tokens.redBg, border: tokens.redBorder }
}

const demandBadge = (level: DemandLevel) => {
  const c = demandColor(level)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`,
    }}>
      {level}
    </span>
  )
}

const currentWeather = {
  location: 'Dallas, TX',
  temp: 34,
  feelsLike: 28,
  condition: 'Freezing Rain',
  humidity: 89,
  wind: '18 mph N',
  visibility: '2 mi',
  icon: '🧊',
}

const forecast = [
  { day: 'Mon', icon: '🌧️', temp: '36°/32°', desc: 'Freezing Rain', demand: 'High' as DemandLevel },
  { day: 'Tue', icon: '🌨️', temp: '30°/25°', desc: 'Ice Storm', demand: 'Extreme' as DemandLevel },
  { day: 'Wed', icon: '🌨️', temp: '28°/22°', desc: 'Heavy Snow', demand: 'Extreme' as DemandLevel },
  { day: 'Thu', icon: '❄️', temp: '25°/18°', desc: 'Ice & Snow', demand: 'Extreme' as DemandLevel },
  { day: 'Fri', icon: '⛅', temp: '35°/28°', desc: 'Clearing', demand: 'High' as DemandLevel },
  { day: 'Sat', icon: '☀️', temp: '42°/34°', desc: 'Sunny', demand: 'Medium' as DemandLevel },
  { day: 'Sun', icon: '☀️', temp: '48°/38°', desc: 'Clear', demand: 'Low' as DemandLevel },
]

const alerts = [
  {
    severity: 'Extreme',
    title: 'Ice Storm Warning',
    detail: 'Significant ice accumulation of 0.5–0.75 inches expected Tuesday through Thursday. Widespread power outages and extremely hazardous travel conditions.',
    issued: 'NWS • Issued 6:00 AM today',
  },
  {
    severity: 'High',
    title: 'Winter Storm Watch',
    detail: 'Heavy snow accumulation of 6–10 inches possible Wednesday night into Thursday morning. Wind gusts up to 35 mph.',
    issued: 'NWS • Issued 4:30 AM today',
  },
  {
    severity: 'Medium',
    title: 'Wind Chill Advisory',
    detail: 'Wind chill values as low as -10°F expected Thursday night through Friday morning.',
    issued: 'NWS • Issued 5:00 AM today',
  },
]

const predictions = [
  'Ice storm expected Tuesday–Thursday — prepare for 3× normal demand',
  'Anticipate 60–80 calls/day during peak (vs. 20–25 normal)',
  'Accident-related tows likely to dominate; breakdowns from dead batteries secondary',
  'Expect extended response times due to road conditions (add 15–30 min)',
]

const historical = [
  { event: 'Ice Storm — Feb 2023', tows: 47, days: 2, avgResponse: '42 min', revenue: '$14,200' },
  { event: 'Blizzard — Jan 2024', tows: 63, days: 3, avgResponse: '55 min', revenue: '$18,900' },
  { event: 'Flash Flood — May 2024', tows: 31, days: 1, avgResponse: '38 min', revenue: '$11,300' },
]

const quickActions = [
  { label: 'Send Driver Availability Check', desc: 'SMS all drivers to confirm availability for the storm period', icon: '📱' },
  { label: 'Pre-position Trucks', desc: 'Deploy trucks to high-accident corridors and highway on-ramps', icon: '🚛' },
  { label: 'Alert Insurance Partners', desc: 'Notify State Farm, Geico, Progressive of expected surge volume', icon: '📋' },
  { label: 'Stock Extra Fuel', desc: 'Top off all truck tanks and arrange emergency fuel delivery', icon: '⛽' },
  { label: 'Activate On-Call Pool', desc: 'Bring off-duty drivers to standby status for rapid dispatch', icon: '📞' },
]

export default function WeatherDemandPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')

  const sevStyle = (sev: string) => {
    const level = sev as DemandLevel
    const c = demandColor(level)
    return { color: c.color, background: c.bg, border: `1px solid ${c.border}`, padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🌦️</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: tokens.text, margin: 0 }}>Weather Demand Alerts</h1>
          </div>
          <p style={{ color: tokens.muted, margin: '4px 0 0 40px', fontSize: 14 }}>
            Monitor weather events that impact towing demand in your service area.
          </p>
        </div>

        {/* Active Alert Banner */}
        <div style={{
          background: tokens.redBg, border: `1px solid ${tokens.redBorder}`, borderRadius: 12,
          padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: tokens.red, fontSize: 15 }}>ACTIVE: Ice Storm Warning in Effect</div>
            <div style={{ color: tokens.text, fontSize: 13, marginTop: 2 }}>
              Significant ice accumulation expected Tue–Thu. Prepare for 3× normal tow demand. See forecasts and quick actions below.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `2px solid ${tokens.border}` }}>
          {(['overview', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? tokens.primary : 'transparent'}`,
                color: activeTab === tab ? tokens.primary : tokens.muted,
                marginBottom: -2,
              }}
            >
              {tab === 'overview' ? 'Overview' : 'Historical Data'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Current Conditions + Demand Prediction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Current Weather */}
              <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Conditions — {currentWeather.location}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <span style={{ fontSize: 48 }}>{currentWeather.icon}</span>
                  <div>
                    <div style={{ fontSize: 42, fontWeight: 700, color: tokens.text, lineHeight: 1 }}>{currentWeather.temp}°F</div>
                    <div style={{ fontSize: 14, color: tokens.muted }}>Feels like {currentWeather.feelsLike}°F</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    {demandBadge('Extreme')}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: tokens.text, marginBottom: 12 }}>{currentWeather.condition}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Humidity', value: `${currentWeather.humidity}%` },
                    { label: 'Wind', value: currentWeather.wind },
                    { label: 'Visibility', value: currentWeather.visibility },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: tokens.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: tokens.text, marginTop: 2 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demand Prediction */}
              <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Demand Prediction
                </h2>
                <div style={{ background: tokens.orangeBg, border: `1px solid ${tokens.orangeBorder}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>📈</span>
                    <span style={{ fontWeight: 700, color: tokens.orange, fontSize: 14 }}>Surge Expected</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {predictions.map((p, i) => (
                      <li key={i} style={{ fontSize: 13, color: tokens.text, lineHeight: 1.6, marginBottom: 4 }}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Calls / Day (Peak)', value: '60–80', color: tokens.red },
                    { label: 'Revenue (Est. 3 days)', value: '$24,000+', color: tokens.green },
                    { label: 'Drivers Needed', value: '8–12', color: tokens.orange },
                    { label: 'Avg Response Time', value: '45–60 min', color: tokens.yellow },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: tokens.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                7-Day Forecast &amp; Tow Demand
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {forecast.map((d, i) => {
                  const c = demandColor(d.demand)
                  const isToday = i === 0
                  return (
                    <div key={d.day} style={{
                      textAlign: 'center', padding: '16px 8px', borderRadius: 10,
                      border: isToday ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`,
                      background: isToday ? '#fafafe' : '#fff',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? tokens.primary : tokens.muted, marginBottom: 8 }}>
                        {isToday ? 'Today' : d.day}
                      </div>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>{d.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: tokens.text }}>{d.temp}</div>
                      <div style={{ fontSize: 11, color: tokens.muted, margin: '4px 0 10px' }}>{d.desc}</div>
                      <div style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
                        fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`,
                      }}>
                        {d.demand}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weather Alerts */}
            <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Weather Alerts
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{
                    borderRadius: 10, padding: 16,
                    border: `1px solid ${demandColor(a.severity as DemandLevel).border}`,
                    background: demandColor(a.severity as DemandLevel).bg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={sevStyle(a.severity)}>{a.severity}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: tokens.text }}>{a.title}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: tokens.text, lineHeight: 1.5 }}>{a.detail}</p>
                    <div style={{ fontSize: 11, color: tokens.muted }}>{a.issued}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Quick Actions
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
                      background: '#f8fafc', border: `1px solid ${tokens.border}`, borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = tokens.primary; e.currentTarget.style.boxShadow = '0 2px 8px rgba(83,58,253,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = tokens.border; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: tokens.text, marginBottom: 2 }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: tokens.muted, lineHeight: 1.4 }}>{a.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Historical Data Tab */
          <div style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: tokens.muted, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Historical Weather Events
            </h2>
            <p style={{ fontSize: 13, color: tokens.muted, marginBottom: 20 }}>
              Past weather events and their impact on your towing operations. Use this data to anticipate staffing and revenue during upcoming storms.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${tokens.border}` }}>
                    {['Event', 'Tows', 'Days', 'Avg Response', 'Revenue'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: tokens.muted, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historical.map((h, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: tokens.text }}>{h.event}</td>
                      <td style={{ padding: '14px 16px', color: tokens.text, fontWeight: 700 }}>{h.tows}</td>
                      <td style={{ padding: '14px 16px', color: tokens.text }}>{h.days}</td>
                      <td style={{ padding: '14px 16px', color: tokens.text }}>{h.avgResponse}</td>
                      <td style={{ padding: '14px 16px', color: tokens.green, fontWeight: 600 }}>{h.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 20, padding: 16, background: tokens.greenBg, border: `1px solid ${tokens.greenBorder}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span>📊</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: tokens.green }}>Key Insight</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: tokens.text, lineHeight: 1.5 }}>
                Ice storms generate the highest demand per day (23.5 tows/day) but blizzards generate the most total revenue due to longer duration. Prioritize driver scheduling for multi-day events.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
