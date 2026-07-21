import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Weather Alerts — fetch weather data for org location
 *
 * GET /api/weather — get current weather + alerts
 *
 * Uses Open-Meteo API (free, no key needed).
 * Sends alerts when severe weather is detected (more tow calls expected).
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const locations = (settings.locations as Array<{ lat?: number; lng?: number; city?: string }>) || [];

  // Use first location or default to LA
  const lat = locations[0]?.lat || 34.0522;
  const lng = locations[0]?.lng || -118.2437;
  const city = locations[0]?.city || org?.city || "Los Angeles";

  try {
    // Open-Meteo free API
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto&forecast_days=3`
    );

    if (!res.ok) throw new Error("Weather API failed");

    const data = await res.json();
    const current = data.current;
    const daily = data.daily;

    // Generate alerts based on weather conditions
    const alerts = [];
    if (current.wind_speed_10m > 40) alerts.push({ type: "warning", message: `High winds: ${current.wind_speed_10m} mph — expect more accident calls` });
    if (current.precipitation > 0.5) alerts.push({ type: "info", message: `Rain/Snow detected — expect increased call volume` });
    if (current.weather_code >= 95) alerts.push({ type: "warning", message: "Thunderstorm — hazardous conditions" });

    // Check forecast
    if (daily?.wind_speed_10m_max?.some((w: number) => w > 50)) {
      alerts.push({ type: "alert", message: "Severe weather forecasted — prepare for high call volume" });
    }

    return NextResponse.json({
      location: { city, lat, lng },
      current: {
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
      },
      forecast: daily ? Array.from({ length: daily.time.length }, (_, i) => ({
        date: daily.time[i],
        high: daily.temperature_2m_max[i],
        low: daily.temperature_2m_min[i],
        precipitation: daily.precipitation_sum[i],
        windMax: daily.wind_speed_10m_max[i],
        weatherCode: daily.weather_code[i],
      })) : [],
      alerts,
    });
  } catch (err) {
    return NextResponse.json({
      location: { city, lat, lng },
      error: "Weather data unavailable",
      alerts: [],
    });
  }
}
