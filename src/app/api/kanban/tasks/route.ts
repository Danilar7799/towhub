import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";

/*
 * Kanban API — bridges TowHub UI to hermes kanban CLI
 * GET /api/kanban/tasks — list tasks
 * POST /api/kanban/tasks — create task
 * PUT /api/kanban/tasks — update task (move, comment, assign)
 * DELETE /api/kanban/tasks — delete task
 */

function runKanban(args: string): string {
  try {
    return execSync(`hermes kanban ${args}`, { encoding: "utf-8", timeout: 15000 }).trim();
  } catch (e: any) {
    return e.stdout || e.message || "Error";
  }
}

function parseTasks(output: string): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = [];
  const lines = output.split("\n").filter(l => l.trim());

  for (const line of lines) {
    // Parse hermes kanban list output format
    // Format varies, try to extract task info
    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (match) {
      tasks.push({
        id: match[1],
        status: match[2],
        priority: match[3],
        title: match[4],
      });
    }
  }
  return tasks;
}

// In-memory store as fallback when CLI isn't available
let memoryTasks: Record<string, unknown>[] = [];
let nextId = 1;

export async function GET() {
  try {
    const output = runKanban("list --json 2>/dev/null || hermes kanban ls");
    const tasks = parseTasks(output);

    // If CLI returned nothing, use memory store
    if (tasks.length === 0 && memoryTasks.length > 0) {
      return NextResponse.json({ tasks: memoryTasks, source: "memory" });
    }

    return NextResponse.json({ tasks, source: "cli" });
  } catch {
    return NextResponse.json({ tasks: memoryTasks, source: "memory" });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, priority, assignee } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  try {
    // Try CLI first
    const args = `create "${title.replace(/"/g, '\\"')}"${priority ? ` --priority ${priority}` : ""}${assignee ? ` --assignee ${assignee}` : ""}`;
    const output = runKanban(args);

    // Also store in memory
    const task = {
      id: `task_${nextId++}`,
      title,
      description: description || "",
      status: "ready",
      priority: priority || "medium",
      assignee: assignee || null,
      board: "default",
      createdAt: new Date().toISOString(),
      comments: [],
    };
    memoryTasks.push(task);

    return NextResponse.json({ success: true, task, output });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status, comment, assignee } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Update memory store
  const task = memoryTasks.find(t => t.id === id);
  if (task) {
    if (status) {
      task.status = status;
      if (status === "completed") runKanban(`complete ${id}`);
    }
    if (comment) {
      (task.comments as string[]).push(comment);
      runKanban(`comment ${id} "${comment.replace(/"/g, '\\"')}"`);
    }
    if (assignee) {
      task.assignee = assignee;
      runKanban(`assign ${id} ${assignee}`);
    }
    task.updatedAt = new Date().toISOString();
  }

  // Try CLI
  if (status === "completed") runKanban(`complete ${id}`);
  if (status === "blocked") runKanban(`block ${id}`);
  if (status === "in_progress") runKanban(`claim ${id}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;

  // Remove from memory
  memoryTasks = memoryTasks.filter(t => t.id !== id);

  // Archive via CLI
  runKanban(`archive ${id}`);

  return NextResponse.json({ success: true });
}