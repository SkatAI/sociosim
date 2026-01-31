import { useEffect, useState } from "react";

type InterviewSummary = {
  agentId: string | null;
  agentName: string;
  agentDescription?: string | null;
  userName: string;
  startedAt: string;
  starterUserId?: string | null;
};

type UsageTokens = {
  totalInputTokens?: number;
  totalOutputTokens?: number;
};

type UseInterviewSummaryArgs = {
  interviewId: string | null;
  includeStarterUserId?: boolean;
  onUsageTokens?: (usage: UsageTokens) => void;
};

export function useInterviewSummary({
  interviewId,
  includeStarterUserId = false,
  onUsageTokens,
}: UseInterviewSummaryArgs) {
  const [interviewSummary, setInterviewSummary] = useState<InterviewSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      if (!interviewId) return;

      try {
        setSummaryError(null);
        const response = await fetch(`/api/interviews/summary?interviewId=${interviewId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? response.statusText;
          throw new Error(message);
        }
        const payload = (await response.json().catch(() => null)) as
          | {
              agent?: { agent_id?: string | null; agent_name?: string; description?: string | null };
              user?: { id?: string | null; name?: string };
              interview?: { started_at?: string };
              usage?: { total_input_tokens?: number; total_output_tokens?: number };
            }
          | null;
        if (!payload?.agent?.agent_name || !payload?.user?.name || !payload?.interview?.started_at) {
          throw new Error("Interview summary missing required fields");
        }
        const summary: InterviewSummary = {
          agentId: payload.agent.agent_id ?? null,
          agentName: payload.agent.agent_name,
          agentDescription: payload.agent.description ?? null,
          userName: payload.user.name,
          startedAt: payload.interview.started_at,
        };
        if (includeStarterUserId) {
          summary.starterUserId = payload.user?.id ?? null;
        }
        setInterviewSummary(summary);
        onUsageTokens?.({
          totalInputTokens: payload.usage?.total_input_tokens,
          totalOutputTokens: payload.usage?.total_output_tokens,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load summary:", errorMessage);
        setSummaryError(`Failed to load interview summary: ${errorMessage}`);
      }
    }

    loadSummary();
  }, [interviewId, includeStarterUserId, onUsageTokens]);

  return {
    interviewSummary,
    summaryError,
    setSummaryError,
  };
}
