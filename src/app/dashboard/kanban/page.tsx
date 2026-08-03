"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";

/*
 * Hermes Kanban — visual board in TowHub dashboard
 * Integrates with hermes kanban CLI for task management
 * Design: Stripe tokens
 */

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: "ready" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  board?: string;
  createdAt: string;
  updatedAt?: string;
  comments?: string[];
  blockedReason?: string;
}

const COLUMNS = [
  { id: "ready", label: "Ready", color: "#3b82f6", icon: "📋" },
  { id: "in_progress", label: "In Progress", color: "#f59e0b", icon: "⚡" },
  { id: "blocked", label: "Blocked", color: "#dc2626", icon: "🚫" },
  { id: "completed", label: "Done", color: "#15be53", icon: "✅" },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: "#dc2626", bg: "#fef2f2", label: "🔴 Urgent" },
  high: { color: "#f59e0b", bg: "#fef3c7", label: "🟠 High" },
  medium: { color: "#3b82f6", bg: "#dbeafe", label: "🔵 Medium" },
  low: { color: "#94a3b8", bg: "#f3f4f6", label: "⚪ Low" },
};

export default function KanbanPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showTask, setShowTask] = useState<KanbanTask | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kanban/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { loadTasks(); }, []);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/kanban/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc, priority: newPriority, assignee: newAssignee || undefined }),
    });
    if (res.ok) {
      toast.success("Task created");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setNewAssignee("");
      loadTasks();
    }
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await fetch("/api/kanban/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    toast.success(`Moved to ${newStatus.replace("_", " ")}`);
    loadTasks();
  };

  const addComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    await fetch("/api/kanban/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, comment: commentText }),
    });
    setCommentText("");
    toast.success("Comment added");
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch("/api/kanban/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    toast.success("Deleted");
    setShowTask(null);
    loadTasks();
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">📋 Kanban Board</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{tasks.length} tasks • {tasks.filter(t => t.status === "in_progress").length} in progress • {tasks.filter(t => t.status === "blocked").length} blocked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadTasks} className="px-3 py-2 border border-[#e5edf5] rounded text-[12px] font-medium hover:bg-[#f6f9fc]">🔄 Refresh</button>
          <button onClick={() => setShowCreate(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] shadow-[0_2px_8px_rgba(83,58,253,0.2)] press-active">
            + New Task
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto min-h-[500px] pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[280px]">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{col.icon}</span>
                  <span className="text-[13px] font-semibold text-[#061b31]">{col.label}</span>
                  <span className="text-[10px] bg-[#f3f4f6] px-1.5 py-0.5 rounded tabular-nums text-[#64748d]">{colTasks.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colTasks.map(task => {
                  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setShowTask(task)}
                      className="bg-white border border-[#e5edf5] rounded-lg p-3.5 cursor-pointer card-hover"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                        <span className="text-[9px] text-[#94a3b8] font-mono">#{task.id.slice(0, 6)}</span>
                      </div>
                      <div className="text-[13px] font-medium text-[#061b31] mb-1">{task.title}</div>
                      {task.description && <div className="text-[11px] text-[#64748d] line-clamp-2 mb-2">{task.description}</div>}
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-5 h-5 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[8px] font-semibold text-[#533afd]">
                            {task.assignee[0].toUpperCase()}
                          </div>
                          <span className="text-[10px] text-[#64748d]">{task.assignee}</span>
                        </div>
                      )}
                      {task.blockedReason && (
                        <div className="mt-2 text-[10px] text-[#dc2626] bg-[#fef2f2] px-2 py-1 rounded">🚫 {task.blockedReason}</div>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-[#94a3b8] border border-dashed border-[#e5edf5] rounded-lg">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {showTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTask(null)}>
          <div className="bg-white rounded-lg max-w-lg w-full shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#e5edf5] flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold">{showTask.title}</div>
                <div className="text-[10px] text-[#94a3b8] font-mono">#{showTask.id.slice(0, 8)}</div>
              </div>
              <button onClick={() => setShowTask(null)} className="text-[18px] text-[#64748d] hover:text-[#061b31]">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Status + Priority */}
              <div className="flex items-center gap-2">
                <select
                  value={showTask.status}
                  onChange={e => { moveTask(showTask.id, e.target.value); setShowTask({ ...showTask, status: e.target.value as KanbanTask["status"] }); }}
                  className="px-2.5 py-1.5 border border-[#e5edf5] rounded text-[12px] outline-none focus:border-[#533afd]"
                >
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: PRIORITY_CONFIG[showTask.priority]?.bg, color: PRIORITY_CONFIG[showTask.priority]?.color }}>
                  {PRIORITY_CONFIG[showTask.priority]?.label}
                </span>
              </div>

              {/* Description */}
              {showTask.description && (
                <div className="bg-[#f6f9fc] rounded p-3">
                  <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-1">Description</div>
                  <div className="text-[13px] text-[#061b31]">{showTask.description}</div>
                </div>
              )}

              {/* Assignee */}
              <div className="bg-[#f6f9fc] rounded p-3">
                <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-1">Assignee</div>
                <div className="text-[13px] font-medium">{showTask.assignee || "Unassigned"}</div>
              </div>

              {/* Comments */}
              <div>
                <div className="text-[11px] font-semibold text-[#64748d] uppercase tracking-wider mb-2">Comments</div>
                <div className="space-y-2 mb-3">
                  {(showTask.comments || []).map((c, i) => (
                    <div key={i} className="bg-[#f6f9fc] rounded p-2.5 text-[12px] text-[#061b31]">{c}</div>
                  ))}
                  {(!showTask.comments || showTask.comments.length === 0) && <div className="text-[11px] text-[#94a3b8]">No comments yet</div>}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-[#e5edf5] rounded text-[12px] outline-none focus:border-[#533afd]"
                    onKeyDown={e => e.key === "Enter" && addComment(showTask.id)}
                  />
                  <button onClick={() => addComment(showTask.id)} className="px-3 py-2 bg-[#533afd] text-white rounded text-[12px] font-medium hover:bg-[#4434d4]">Add</button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-[#e5edf5]">
                {showTask.status !== "completed" && (
                  <button onClick={() => { moveTask(showTask.id, "completed"); setShowTask({ ...showTask, status: "completed" }); }} className="flex-1 py-2 bg-[#15be53] text-white rounded text-[12px] font-medium hover:bg-[#0ea34a]">✅ Complete</button>
                )}
                {showTask.status === "ready" && (
                  <button onClick={() => { moveTask(showTask.id, "in_progress"); setShowTask({ ...showTask, status: "in_progress" }); }} className="flex-1 py-2 bg-[#f59e0b] text-white rounded text-[12px] font-medium hover:bg-[#d97706]">⚡ Start</button>
                )}
                <button onClick={() => deleteTask(showTask.id)} className="px-4 py-2 border border-[#fecaca] text-[#dc2626] rounded text-[12px] font-medium hover:bg-[#fef2f2]">🗑️ Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold mb-5">New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Title *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" placeholder="What needs to be done?" autoFocus />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none resize-none focus:border-[#533afd]" placeholder="Details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full px-3 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]">
                    <option value="low">⚪ Low</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Assignee</label>
                  <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="w-full px-3 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]">
                    <option value="">Unassigned</option>
                    <option value="default">default</option>
                    <option value="chatgpt">chatgpt</option>
                    <option value="mimo">mimo</option>
                    <option value="openrouter">openrouter</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button onClick={createTask} disabled={!newTitle.trim()} className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}