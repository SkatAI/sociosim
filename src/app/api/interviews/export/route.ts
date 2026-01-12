import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { marked } from "marked";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

export async function GET(req: NextRequest) {
  let browser;
  try {
    const { searchParams } = new URL(req.url);
    const interviewId = searchParams.get("interviewId");

    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing 'interviewId' query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("id, agent_id, started_at, created_at")
      .eq("id", interviewId)
      .single();

    if (interviewError || !interview) {
      const message = interviewError?.message ?? "Interview not found";
      console.error("[/api/interviews/export GET] Interview error:", message);
      return NextResponse.json({ error: "Entretien introuvable." }, { status: 404 });
    }

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("agent_name, description")
      .eq("id", interview.agent_id)
      .single();

    if (agentError || !agent) {
      const message = agentError?.message ?? "Agent not found";
      console.error("[/api/interviews/export GET] Agent error:", message);
      return NextResponse.json({ error: "Agent introuvable." }, { status: 404 });
    }

    const { data: userLink } = await supabase
      .from("user_interview_session")
      .select("user_id, users(name, email)")
      .eq("interview_id", interviewId)
      .limit(1)
      .maybeSingle();

    const linkedUser = Array.isArray(userLink?.users) ? userLink?.users[0] : userLink?.users;
    const userName = linkedUser?.name ?? "";
    const userEmail = linkedUser?.email ?? "";
    const fallbackUserName = userName || (userEmail ? userEmail.split("@")[0] : "Utilisateur");

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
      : { data: [] as Array<{ id: string; role: string; content: string; created_at: string }> };

    const { data: prompt } = await supabase
      .from("agent_prompts")
      .select("system_prompt, version")
      .eq("agent_id", interview.agent_id)
      .eq("published", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const agentName = formatAgentName(agent.agent_name);
    const agentDescription = agent.description ?? "Aucune description.";
    const interviewDate = formatDateTime(interview.started_at ?? interview.created_at);
    const exportDate = new Date().toLocaleDateString("fr-FR");
    const promptHtml = prompt?.system_prompt
      ? await marked.parse(prompt.system_prompt)
      : "<p>Prompt indisponible.</p>";

    const messageHtml = (messages ?? [])
      .map((msg) => {
        const author = msg.role === "assistant" ? agentName : fallbackUserName;
        const roleClass = msg.role === "assistant" ? "assistant" : "user";
        const content = escapeHtml(msg.content ?? "").replace(/\n/g, "<br />");
        return `
          <div class="message ${roleClass}">
            <div class="message-meta">${escapeHtml(author)}</div>
            <div class="message-body">${content}</div>
          </div>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: "Helvetica Neue", Arial, sans-serif;
              color: #1f2937;
              margin: 0;
              padding: 0;
            }
            .container {
              padding: 32px;
            }
            h1 {
              font-size: 22px;
              margin: 0 0 6px 0;
              font-weight: 600;
            }
            .interview-heading {
              font-size: 14px;
              color: #4b5563;
              margin: 0 0 10px 0;
            }
            .muted {
              color: #6b7280;
              font-size: 12px;
              margin: 2px 0;
            }
            .meta-line {
              font-size: 12px;
              margin: 8px 0;
            }
            .section-title {
              font-size: 22px;
              font-weight: 600;
              margin: 24px 0 8px;
            }
            .message {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 10px;
              break-inside: avoid;
              page-break-inside: avoid;
              max-width: 85%;
            }
            .message.user {
              margin-left: auto;
              background: #f3f4f6;
            }
            .message.assistant {
              margin-right: auto;
              background: #ffffff;
            }
            .message-meta {
              font-size: 11px;
              font-weight: 600;
              margin-bottom: 6px;
            }
            .message-body {
              font-size: 12px;
              line-height: 1.5;
              white-space: normal;
            }
            .prompt {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              font-size: 12px;
              line-height: 1.5;
              break-inside: auto;
              page-break-inside: auto;
            }
            .prompt h1, .prompt h2, .prompt h3 {
              margin: 12px 0 6px;
              font-size: 13px;
            }
            .prompt p { margin: 6px 0; }
            .prompt ul { margin: 6px 0 6px 16px; }
            .prompt-section {
              page-break-before: always;
              break-before: page;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Entretien avec ${escapeHtml(agentName)}</h1>
            <p class="interview-heading">Entretien avec ${escapeHtml(agentName)} par ${escapeHtml(fallbackUserName)} le ${escapeHtml(interviewDate)}</p>
            <div class="muted">Entretien du ${escapeHtml(interviewDate)}, Export du ${escapeHtml(exportDate)}</div>
            <div class="muted"><strong>Session</strong> : ${escapeHtml(primarySessionId)}</div>
            <div class="meta-line"><strong>Utilisateur</strong> : ${escapeHtml(userEmail)} ${escapeHtml(fallbackUserName)}</div>
            <div class="meta-line"><strong>Agent</strong> : ${escapeHtml(agentName)} ${escapeHtml(agentDescription)}</div>

            <div class="section-title">Entretien</div>
            ${messageHtml || "<div class=\"muted\">Aucun message.</div>"}

            <div class="prompt-section">
              <div class="section-title">Prompt système</div>
              <div class="prompt">${promptHtml}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", bottom: "24px", left: "24px", right: "24px" },
    });

    const safeAgentName = agentName.replace(/\s+/g, "-").toLowerCase();
    const fileName = `entretien-${safeAgentName}-${new Date().toISOString().slice(0, 10)}.pdf`;

    const pdfBody = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/interviews/export GET] Error:", message);
    return NextResponse.json(
      { error: "Impossible de generer le PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
