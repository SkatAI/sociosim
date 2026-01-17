import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { marked } from "marked";
import {
  fetchInterviewExportData,
  InterviewExportError,
} from "@/lib/interviewExport";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

    const exportData = await fetchInterviewExportData(interviewId);
    const {
      agentName,
      agentDescription,
      interviewDate,
      userName,
      userEmail,
      primarySessionId,
      messages,
      promptMarkdown,
    } = exportData;
    const exportDate = new Date().toLocaleDateString("fr-FR");
    const promptHtml = promptMarkdown
      ? await marked.parse(promptMarkdown)
      : "<p>Prompt indisponible.</p>";

    const messageHtml = (messages ?? [])
      .map((msg) => {
        const author = msg.role === "assistant" ? agentName : userName;
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
            <p class="interview-heading">Entretien avec ${escapeHtml(agentName)} par ${escapeHtml(userName)} le ${escapeHtml(interviewDate)}</p>
            <div class="muted">Entretien du ${escapeHtml(interviewDate)}, Export du ${escapeHtml(exportDate)}</div>
            <div class="muted"><strong>Session</strong> : ${escapeHtml(primarySessionId)}</div>
            <div class="meta-line"><strong>Utilisateur</strong> : ${escapeHtml(userEmail)} ${escapeHtml(userName)}</div>
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
    if (error instanceof InterviewExportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
