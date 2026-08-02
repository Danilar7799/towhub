/**
 * Telegram Notification Utility
 * Sends messages to Telegram bot
 */

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

let telegramConfig: TelegramConfig | null = null;

export function setTelegramConfig(config: TelegramConfig) {
  telegramConfig = config;
}

export function getTelegramConfig(): TelegramConfig | null {
  if (telegramConfig) return telegramConfig;
  
  // Fallback to environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || "7373968482";
  
  if (botToken) {
    telegramConfig = { botToken, chatId };
    return telegramConfig;
  }
  
  return null;
}

export async function sendTelegramMessage(text: string, options?: { parseMode?: "HTML" | "Markdown"; disablePreview?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const config = getTelegramConfig();
  if (!config) {
    return { ok: false, error: "Telegram not configured (TELEGRAM_BOT_TOKEN missing)" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: options?.parseMode || "HTML",
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      return { ok: false, error: data.description || "Telegram API error" };
    }
    
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export function formatCallNotification(call: {
  id: string;
  callerName?: string;
  callerPhone: string;
  status: string;
  callType?: string;
  serviceNeeded?: string;
  pickupAddress?: string;
  urgency?: string;
}): string {
  const urgencyEmoji = call.urgency === "emergency" ? "🔴🔴🔴" : call.urgency === "high" ? "🟠🟠" : "🟡";
  
  let msg = `<b>${urgencyEmoji} Новый звонок</b>\n\n`;
  msg += `<b>ID:</b> <code>${call.id}</code>\n`;
  msg += `<b>Клиент:</b> ${call.callerName || "Неизвестно"}\n`;
  msg += `<b>Телефон:</b> <code>${call.callerPhone}</code>\n`;
  msg += `<b>Статус:</b> ${call.status === "ringing" ? "🔔 Звонок" : "🟢 В разговоре"}\n`;
  
  if (call.callType) msg += `<b>Тип:</b> ${call.callType}\n`;
  if (call.serviceNeeded) msg += `<b>Услуга:</b> ${call.serviceNeeded}\n`;
  if (call.pickupAddress) msg += `<b>📍 Адрес:</b> ${call.pickupAddress}\n`;
  if (call.urgency) msg += `<b>Срочность:</b> ${call.urgency.toUpperCase()}\n`;
  
  msg += `\n<i>${new Date().toLocaleString("ru-RU")}</i>`;
  
  return msg;
}

export function formatJobCompletionNotification(job: {
  id: string;
  customerName?: string;
  pickupAddress: string;
  destinationAddress?: string;
  totalAmount?: number;
  assignedDriverName?: string;
  vehicleInfo?: string;
}): string {
  let msg = `<b>✅ Заказ завершён</b>\n\n`;
  msg += `<b>ID:</b> <code>${job.id}</code>\n`;
  msg += `<b>Клиент:</b> ${job.customerName || "Walk-in"}\n`;
  if (job.assignedDriverName) msg += `<b>Водитель:</b> ${job.assignedDriverName}\n`;
  msg += `<b>📍 Откуда:</b> ${job.pickupAddress}\n`;
  if (job.destinationAddress) msg += `<b>🏁 Куда:</b> ${job.destinationAddress}\n`;
  if (job.vehicleInfo) msg += `<b>🚗 ТС:</b> ${job.vehicleInfo}\n`;
  if (job.totalAmount) msg += `<b>💰 Сумма:</b> $${job.totalAmount.toFixed(2)}\n`;
  
  msg += `\n<i>${new Date().toLocaleString("ru-RU")}</i>`;
  
  return msg;
}

export function formatDailyReport(report: {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  jobsCompleted: number;
  avgJobValue: number;
  topDrivers: Array<{ name: string; jobs: number; revenue: number }>;
  reminders?: Array<{ title: string; priority: string }>;
}): string {
  const periodLabel = { daily: "Ежедневный", weekly: "Недельный", monthly: "Месячный", yearly: "Годовой" }[report.period] || report.period;
  
  let msg = `<b>📊 ${periodLabel} отчёт</b>\n\n`;
  
  msg += `<b>💰 Выручка:</b> $${report.revenue.toLocaleString()}\n`;
  msg += `<b>💸 Расходы:</b> $${report.expenses.toLocaleString()}\n`;
  msg += `<b>📈 Прибыль:</b> $${report.profit.toLocaleString()}\n`;
  msg += `<b>📋 Заказов:</b> ${report.jobsCompleted}\n`;
  msg += `<b>💵 Ср. чек:</b> $${report.avgJobValue.toLocaleString()}\n\n`;
  
  const margin = report.revenue > 0 ? Math.round((report.profit / report.revenue) * 100) : 0;
  msg += `<b>📊 Маржа:</b> ${margin}%\n\n`;
  
  if (report.topDrivers && report.topDrivers.length > 0) {
    msg += `<b>🏆 Топ водителей:</b>\n`;
    report.topDrivers.slice(0, 3).forEach((d, i) => {
      const medal = ["🥇", "🥈", "🥉"][i];
      msg += `${medal} ${d.name} — ${d.jobs} заказов, $${d.revenue.toLocaleString()}\n`;
    });
    msg += "\n";
  }
  
  if (report.reminders && report.reminders.length > 0) {
    const highPriority = report.reminders.filter(r => r.priority === "high");
    if (highPriority.length > 0) {
      msg += `<b>⚠️ Важные напоминания:</b>\n`;
      highPriority.forEach(r => {
        msg += `• ${r.title}\n`;
      });
    }
  }
  
  msg += `\n<i>TowHub • ${new Date().toLocaleString("ru-RU")}</i>`;
  
  return msg;
}