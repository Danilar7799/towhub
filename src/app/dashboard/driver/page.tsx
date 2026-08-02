"use client";

import { useState, useEffect } from "react";

/*
 * Driver Mobile View
 * Shows jobs with AI dispatcher summary translated to Russian
 * Driver can request AI callback to notify about status/needs
 */

interface DriverJob {
  id: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress: string;
  destinationAddress?: string;
  totalAmount?: number;
  towVehicleMake?: string;
  towVehicleModel?: string;
  towVehicleYear?: number;
  towVehicleColor?: string;
  towVehiclePlate?: string;
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  aiSummary?: string; // AI dispatcher summary
  aiCallTranscript?: string;
}

interface CallbackRequest {
  type: "arrived" | "delayed" | "need_info" | "completed" | "custom";
  label: string;
  labelRu: string;
  message: string;
}

const CALLBACK_TYPES: CallbackRequest[] = [
  { type: "arrived", label: "I've arrived", labelRu: "Я на месте", message: "The driver has arrived at the pickup location. Please meet them outside with your vehicle keys." },
  { type: "delayed", label: "I'm delayed", labelRu: "Задерживаюсь", message: "The driver is running about 15 minutes late due to traffic. We apologize for the delay." },
  { type: "need_info", label: "Need more info", labelRu: "Нужна информация", message: "The driver needs additional information about your vehicle location. Please call us back or provide more details." },
  { type: "completed", label: "Job completed", labelRu: "Заказ выполнен", message: "Your vehicle has been delivered. Thank you for choosing Pacific Towing & Recovery!" },
  { type: "custom", label: "Custom message", labelRu: "Своё сообщение", message: "" },
];

const STATUS_LABELS_RU: Record<string, string> = {
  pending: "Ожидание",
  assigned: "Назначен",
  en_route: "В пути",
  on_scene: "На месте",
  towing: "Буксирую",
  completed: "Завершён",
  cancelled: "Отменён",
};

export default function DriverViewPage() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DriverJob | null>(null);
  const [showCallback, setShowCallback] = useState(false);
  const [callbackType, setCallbackType] = useState<CallbackRequest>(CALLBACK_TYPES[0]);
  const [customMessage, setCustomMessage] = useState("");
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/jobs?driver=current");
    const data = await res.json();
    setJobs(data.jobs || []);
  };

  useEffect(() => { load(); }, []);

  const requestCallback = async () => {
    if (!selectedJob) return;
    setCalling(true);
    setCallResult(null);

    const message = callbackType.type === "custom" ? customMessage : callbackType.message;

    const res = await fetch("/api/retell/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "outbound_call",
        phone_number: selectedJob.customerPhone,
        metadata: {
          job_id: selectedJob.id,
          callback_type: callbackType.type,
          driver_message: message,
          source: "driver_callback",
        },
      }),
    });

    const data = await res.json();
    if (data.success) {
      setCallResult("✅ AI диспетчер позвонит клиенту");
    } else {
      setCallResult(`❌ Ошибка: ${data.error}`);
    }
    setCalling(false);
  };

  const updateStatus = async (jobId: string, newStatus: string) => {
    await fetch("/api/jobs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, status: newStatus }),
    });
    load();
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === "completed");

  return (
    <div className="min-h-screen bg-[#f6f9fc]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="bg-[#533afd] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[16px] font-semibold">🚛 TowHub Водитель</div>
          <div className="text-[11px] opacity-80">{activeJobs.length} активных заказов</div>
        </div>
        <button onClick={load} className="text-[12px] bg-white/20 px-3 py-1 rounded">
          🔄 Обновить
        </button>
      </div>

      {/* Job List */}
      <div className="p-4 space-y-3">
        {activeJobs.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-[32px] mb-3 opacity-30">📋</div>
            <div className="text-[14px] text-[#64748d]">Нет активных заказов</div>
          </div>
        ) : activeJobs.map(job => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className={`bg-white rounded-lg p-4 border-l-4 ${
              job.status === "assigned" ? "border-l-[#3b82f6]" :
              job.status === "en_route" ? "border-l-[#6366f1]" :
              job.status === "on_scene" ? "border-l-[#a855f7]" :
              job.status === "towing" ? "border-l-[#f97316]" :
              "border-l-[#e5edf5]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                job.status === "assigned" ? "bg-[#dbeafe] text-[#1e40af]" :
                job.status === "en_route" ? "bg-[#e0e7ff] text-[#4338ca]" :
                job.status === "on_scene" ? "bg-[#f3e8ff] text-[#7c3aed]" :
                job.status === "towing" ? "bg-[#ffedd5] text-[#9a3412]" :
                "bg-[#f3f4f6] text-[#4b5563]"
              }`}>
                {STATUS_LABELS_RU[job.status] || job.status}
              </span>
              <span className="text-[11px] text-[#64748d]">{fmtTime(job.createdAt)}</span>
            </div>
            <div className="text-[14px] font-medium mb-1">{job.customerName || "Клиент"}</div>
            <div className="text-[12px] text-[#64748d]">{job.pickupAddress}</div>
            {job.destinationAddress && (
              <div className="text-[12px] text-[#64748d] mt-0.5">→ {job.destinationAddress}</div>
            )}
          </div>
        ))}

        {/* Completed jobs */}
        {completedJobs.length > 0 && (
          <>
            <div className="text-[11px] text-[#94a3b8] uppercase tracking-wider pt-4">Завершённые</div>
            {completedJobs.slice(0, 5).map(job => (
              <div key={job.id} onClick={() => setSelectedJob(job)} className="bg-white rounded-lg p-4 opacity-60">
                <div className="text-[13px] font-medium">{job.customerName || "Клиент"}</div>
                <div className="text-[11px] text-[#64748d]">{job.pickupAddress}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setSelectedJob(null)}>
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#e5edf5] px-4 py-3 flex items-center justify-between">
              <div className="text-[16px] font-semibold">Детали заказа</div>
              <button onClick={() => setSelectedJob(null)} className="text-[20px] text-[#64748d]">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  selectedJob.status === "assigned" ? "bg-[#dbeafe] text-[#1e40af]" :
                  selectedJob.status === "en_route" ? "bg-[#e0e7ff] text-[#4338ca]" :
                  selectedJob.status === "on_scene" ? "bg-[#f3e8ff] text-[#7c3aed]" :
                  selectedJob.status === "towing" ? "bg-[#ffedd5] text-[#9a3412]" :
                  "bg-[#f3f4f6] text-[#4b5563]"
                }`}>
                  {STATUS_LABELS_RU[selectedJob.status] || selectedJob.status}
                </span>
                {selectedJob.totalAmount && (
                  <span className="text-[14px] font-semibold">${selectedJob.totalAmount}</span>
                )}
              </div>

              {/* Customer */}
              <div className="bg-[#f6f9fc] rounded-lg p-3">
                <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-1">Клиент</div>
                <div className="text-[14px] font-medium">{selectedJob.customerName || "—"}</div>
                {selectedJob.customerPhone && (
                  <a href={`tel:${selectedJob.customerPhone}`} className="text-[13px] text-[#533afd]">
                    📞 {selectedJob.customerPhone}
                  </a>
                )}
              </div>

              {/* Location */}
              <div className="bg-[#f6f9fc] rounded-lg p-3">
                <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-1">Местоположение</div>
                <div className="text-[14px] font-medium">{selectedJob.pickupAddress}</div>
                {selectedJob.destinationAddress && (
                  <div className="text-[13px] text-[#64748d] mt-1">→ {selectedJob.destinationAddress}</div>
                )}
              </div>

              {/* Vehicle */}
              {(selectedJob.towVehicleMake || selectedJob.towVehicleModel) && (
                <div className="bg-[#f6f9fc] rounded-lg p-3">
                  <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-1">Автомобиль</div>
                  <div className="text-[14px] font-medium">
                    {selectedJob.towVehicleYear} {selectedJob.towVehicleMake} {selectedJob.towVehicleModel}
                  </div>
                  {selectedJob.towVehicleColor && <div className="text-[12px] text-[#64748d]">{selectedJob.towVehicleColor}</div>}
                  {selectedJob.towVehiclePlate && <div className="text-[12px] text-[#64748d] font-mono">{selectedJob.towVehiclePlate}</div>}
                </div>
              )}

              {/* AI Summary (Russian) */}
              {selectedJob.notes && (
                <div className="bg-[#f3e8ff] rounded-lg p-3 border border-[#e9d5ff]">
                  <div className="text-[10px] text-[#7c3aed] uppercase tracking-wider mb-1">🤖 AI Диспетчер — Резюме</div>
                  <div className="text-[13px] text-[#4c1d95] leading-[1.6]">
                    {selectedJob.notes.split("\n").map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status buttons */}
              <div className="grid grid-cols-2 gap-2">
                {selectedJob.status === "assigned" && (
                  <button onClick={() => updateStatus(selectedJob.id, "en_route")} className="bg-[#6366f1] text-white py-2.5 rounded text-[13px] font-medium">
                    🚗 Еду на вызов
                  </button>
                )}
                {selectedJob.status === "en_route" && (
                  <button onClick={() => updateStatus(selectedJob.id, "on_scene")} className="bg-[#a855f7] text-white py-2.5 rounded text-[13px] font-medium">
                    📍 Я на месте
                  </button>
                )}
                {selectedJob.status === "on_scene" && (
                  <button onClick={() => updateStatus(selectedJob.id, "towing")} className="bg-[#f97316] text-white py-2.5 rounded text-[13px] font-medium">
                    🚛 Буксирую
                  </button>
                )}
                {selectedJob.status === "towing" && (
                  <button onClick={() => updateStatus(selectedJob.id, "completed")} className="bg-[#15be53] text-white py-2.5 rounded text-[13px] font-medium">
                    ✅ Завершить
                  </button>
                )}
              </div>

              {/* AI Callback button */}
              <button
                onClick={() => setShowCallback(true)}
                className="w-full bg-[#533afd] text-white py-3 rounded text-[14px] font-medium flex items-center justify-center gap-2"
              >
                🤖 Попросить AI позвонить клиенту
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Callback Modal */}
      {showCallback && selectedJob && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowCallback(false)}>
          <div className="bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#e5edf5] px-4 py-3 flex items-center justify-between">
              <div className="text-[16px] font-semibold">🤖 AI Позвонит Клиенту</div>
              <button onClick={() => setShowCallback(false)} className="text-[20px] text-[#64748d]">×</button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-[13px] text-[#64748d]">
                Выберите что сказать клиенту — AI диспетчер позвонит на <strong>{selectedJob.customerPhone}</strong>
              </div>

              {CALLBACK_TYPES.map(cb => (
                <button
                  key={cb.type}
                  onClick={() => setCallbackType(cb)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    callbackType.type === cb.type
                      ? "border-[#533afd] bg-[#533afd]/[0.04]"
                      : "border-[#e5edf5] hover:border-[#b9b9f9]"
                  }`}
                >
                  <div className="text-[14px] font-medium">{cb.labelRu}</div>
                  <div className="text-[11px] text-[#64748d]">{cb.label}</div>
                  {cb.type !== "custom" && (
                    <div className="text-[11px] text-[#94a3b8] mt-1">{cb.message}</div>
                  )}
                </button>
              ))}

              {callbackType.type === "custom" && (
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Введите сообщение для клиента..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none resize-none"
                />
              )}

              {callResult && (
                <div className={`p-3 rounded-lg text-[13px] ${callResult.startsWith("✅") ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef2f2] text-[#991b1b]"}`}>
                  {callResult}
                </div>
              )}

              <button
                onClick={requestCallback}
                disabled={calling || (callbackType.type === "custom" && !customMessage)}
                className="w-full bg-[#533afd] text-white py-3 rounded text-[14px] font-medium disabled:opacity-50"
              >
                {calling ? "Звоню..." : "📞 Позвонить через AI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}