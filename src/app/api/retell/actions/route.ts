import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, jobs, users, callLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Retell from "retell-sdk";

/*
 * Retell AI Full API Integration
 * POST /api/retell/actions — perform Retell actions
 *
 * Actions:
 * - create_agent: Create new Retell agent
 * - update_agent: Update agent prompt/voice
 * - outbound_call: Call a customer
 * - stop_call: Stop active call
 * - sync_calls: Sync call history from Retell
 * - get_call: Get call details
 * - create_knowledge_base: Upload knowledge base
 * - list_voices: List available voices
 * - buy_number: Purchase phone number
 * - test_web_call: Create web test call
 */

async function getRetellClient(orgId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const retellConfig = (settings.retellConfig as Record<string, unknown>) || {};
  const apiKey = retellConfig.apiKey as string;
  if (!apiKey) throw new Error("Retell API key not configured");
  return { client: new Retell({ apiKey }), config: retellConfig, org };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  try {
    const { client, config } = await getRetellClient(user.orgId);

    switch (action) {
      // ── Agent Management ──
      case "create_agent": {
        const { prompt, voice_id, agent_name } = body;
        const agent = await client.agent.create({
          response_engine: { type: "retell-llm", llm_id: body.llm_id || undefined },
          voice_id: voice_id || "retell-ai-mark",
          agent_name: agent_name || "TowHub Dispatcher",
        });
        return NextResponse.json({ success: true, agent });
      }

      case "update_agent": {
        const { agent_id, prompt, voice_id } = body;
        if (!agent_id) return NextResponse.json({ error: "agent_id required" }, { status: 400 });
        const updateParams: Record<string, unknown> = {};
        if (prompt) updateParams.response_engine = { type: "retell-llm", llm_id: body.llm_id };
        if (voice_id) updateParams.voice_id = voice_id;
        const agent = await client.agent.update(agent_id, updateParams as any);
        return NextResponse.json({ success: true, agent });
      }

      case "list_agents": {
        const agents = await client.agent.list();
        return NextResponse.json({ agents });
      }

      case "get_agent": {
        const { agent_id } = body;
        if (!agent_id) return NextResponse.json({ error: "agent_id required" }, { status: 400 });
        const agent = await client.agent.retrieve(agent_id);
        return NextResponse.json({ agent });
      }

      // ── Call Management ──
      case "outbound_call": {
        const { phone_number, agent_id, metadata } = body;
        if (!phone_number) return NextResponse.json({ error: "phone_number required" }, { status: 400 });
        const call = await client.call.createPhoneCall({
          from_number: config.phoneNumber as string,
          to_number: phone_number,
          override_agent_id: agent_id || config.agentId as string,
          metadata: { ...metadata, org_id: user.orgId, source: "towhub_dispatcher" },
        });
        return NextResponse.json({ success: true, call });
      }

      case "stop_call": {
        const { call_id } = body;
        if (!call_id) return NextResponse.json({ error: "call_id required" }, { status: 400 });
        await client.call.stop(call_id);
        return NextResponse.json({ success: true });
      }

      case "get_call": {
        const { call_id } = body;
        if (!call_id) return NextResponse.json({ error: "call_id required" }, { status: 400 });
        const call = await client.call.retrieve(call_id);
        return NextResponse.json({ call });
      }

      case "sync_calls": {
        // Sync call history from Retell to TowHub
        const calls = await client.call.list({ limit: 50 });
        let synced = 0;
        for (const call of calls.items || []) {
          const existing = await db.select().from(callLogs).where(eq(callLogs.blandCallId, call.call_id)).limit(1);
          if (existing.length === 0 && call.call_status === "ended") {
            await db.insert(callLogs).values({
              orgId: user.orgId,
              blandCallId: call.call_id,
              callerPhone: (call as any).from_number || "",
              callerName: (call as any).metadata?.customer_name,
              status: "completed",
              duration: Math.round(((call as any).duration_ms || 0) / 1000),
              transcript: (call as any).transcript || "",
              summary: (call as any).call_analysis?.call_summary,
              callType: "roadside",
              urgency: "medium",
              recordingUrl: (call as any).recording_url,
              metadata: { provider: "retell", synced_at: new Date().toISOString() },
              startedAt: (call as any).start_timestamp ? new Date((call as any).start_timestamp) : null,
              endedAt: (call as any).end_timestamp ? new Date((call as any).end_timestamp) : null,
            });
            synced++;
          }
        }
        return NextResponse.json({ success: true, synced, total: (calls.items || []).length });
      }

      case "rerun_analysis": {
        const { call_id } = body;
        if (!call_id) return NextResponse.json({ error: "call_id required" }, { status: 400 });
        await client.call.rerunAnalysis(call_id);
        return NextResponse.json({ success: true });
      }

      // ── Web Call (test) ──
      case "test_web_call": {
        const { agent_id } = body;
        const call = await client.call.createWebCall({
          agent_id: agent_id || config.agentId as string,
        });
        return NextResponse.json({ success: true, call, access_token: (call as any).access_token });
      }

      // ── Phone Numbers ──
      case "list_numbers": {
        const numbers = await client.phoneNumber.list();
        return NextResponse.json({ numbers });
      }

      case "buy_number": {
        const { area_code } = body;
        const number = await client.phoneNumber.create({
          area_code: area_code || "253",
        });
        return NextResponse.json({ success: true, number });
      }

      case "import_twilio_number": {
        const { phone_number, twilio_account_sid, twilio_auth_token } = body;
        const number = await client.phoneNumber.import({
          phone_number,
          termination_uri: body.termination_uri,
        });
        return NextResponse.json({ success: true, number });
      }

      // ── Knowledge Base ──
      case "list_knowledge_bases": {
        const kbs = await client.knowledgeBase.list();
        return NextResponse.json({ knowledge_bases: kbs });
      }

      case "create_knowledge_base": {
        const { name, knowledge_base_texts } = body;
        const kb = await client.knowledgeBase.create({
          knowledge_base_name: name || "TowHub Knowledge",
          knowledge_base_texts: knowledge_base_texts || [],
        });
        return NextResponse.json({ success: true, knowledge_base: kb });
      }

      // ── Voices ──
      case "list_voices": {
        const voices = await client.voice.list();
        return NextResponse.json({ voices });
      }

      // ── LLM Management ──
      case "list_llms": {
        const llms = await client.llm.list();
        return NextResponse.json({ llms });
      }

      case "create_llm": {
        const { general_prompt, model } = body;
        const llm = await client.llm.create({
          general_prompt: general_prompt || "You are a towing dispatcher.",
          model: model || "gpt-4o-mini",
        });
        return NextResponse.json({ success: true, llm });
      }

      // ── SMS ──
      case "send_sms": {
        const { to_number, agent_id, initial_message } = body;
        const chat = await client.chat.createSMSChat({
          to_number,
          from_number: config.phoneNumber as string,
          override_agent_id: agent_id || config.agentId as string,
        });
        return NextResponse.json({ success: true, chat });
      }

      // ── Batch Calls ──
      case "batch_call": {
        const { phone_numbers, agent_id, task } = body;
        const results = [];
        for (const number of phone_numbers || []) {
          try {
            const call = await client.call.createPhoneCall({
              from_number: config.phoneNumber as string,
              to_number: number,
              override_agent_id: agent_id || config.agentId as string,
              metadata: { org_id: user.orgId, batch: "true", task: task || "callback" },
            });
            results.push({ number, call_id: (call as any).call_id, status: "initiated" });
          } catch (err) {
            results.push({ number, error: String(err) });
          }
        }
        return NextResponse.json({ success: true, results });
      }

      // ── Concurrency ──
      case "get_concurrency": {
        const concurrency = await client.concurrency.retrieve();
        return NextResponse.json({ concurrency });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[Retell API] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    available_actions: [
      "create_agent", "update_agent", "list_agents", "get_agent",
      "outbound_call", "stop_call", "get_call", "sync_calls", "rerun_analysis",
      "test_web_call",
      "list_numbers", "buy_number", "import_twilio_number",
      "list_knowledge_bases", "create_knowledge_base",
      "list_voices",
      "list_llms", "create_llm",
      "send_sms",
      "batch_call",
      "get_concurrency",
    ],
  });
}