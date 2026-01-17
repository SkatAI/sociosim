import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

export type InterviewExportMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export type InterviewExportData = {
  interviewId: string;
  agentId: string;
  agentName: string;
  agentDescription: string;
  interviewDate: string;
  userName: string;
  userEmail: string;
  primarySessionId: string;
  messages: InterviewExportMessage[];
  promptMarkdown: string | null;
};

export class InterviewExportError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const formatAgentName = (name?: string) => {
  if (!name) return "Agent";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR");
};

export async function fetchInterviewExportData(
  interviewId: string
): Promise<InterviewExportData> {
  const supabase = createServiceSupabaseClient();

  const { data: interview, error: interviewError } = await supabase
    .from("interviews")
    .select("id, agent_id, started_at, created_at")
    .eq("id", interviewId)
    .single();

  if (interviewError || !interview) {
    const message = interviewError?.message ?? "Interview not found";
    console.error("[interviewExport] Interview error:", message);
    throw new InterviewExportError("Entretien introuvable.", 404);
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("agent_name, description")
    .eq("id", interview.agent_id)
    .single();

  if (agentError || !agent) {
    const message = agentError?.message ?? "Agent not found";
    console.error("[interviewExport] Agent error:", message);
    throw new InterviewExportError("Agent introuvable.", 404);
  }

  const { data: userLink } = await supabase
    .from("user_interview_session")
    .select("user_id, users(name, email)")
    .eq("interview_id", interviewId)
    .limit(1)
    .maybeSingle();

  const linkedUser = Array.isArray(userLink?.users) ? userLink?.users[0] : userLink?.users;
  const rawUserName = linkedUser?.name ?? "";
  const userEmail = linkedUser?.email ?? "";
  const userName = rawUserName || (userEmail ? userEmail.split("@")[0] : "Utilisateur");

  const { data: sessions } = await supabase
    .from("user_interview_session")
    .select("session_id")
    .eq("interview_id", interviewId);

  const sessionIds = (sessions ?? []).map((row) => row.session_id);
  const primarySessionId = sessionIds[0] ?? "";
  const { data: messages } = sessionIds.length
    ? await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true })
    : { data: [] as InterviewExportMessage[] };

  const { data: prompt } = await supabase
    .from("agent_prompts")
    .select("system_prompt, version")
    .eq("agent_id", interview.agent_id)
    .eq("published", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    interviewId,
    agentId: interview.agent_id,
    agentName: formatAgentName(agent.agent_name),
    agentDescription: agent.description ?? "Aucune description.",
    interviewDate: formatDateTime(interview.started_at ?? interview.created_at),
    userName,
    userEmail,
    primarySessionId,
    messages: messages ?? [],
    promptMarkdown: prompt?.system_prompt ?? null,
  };
}
