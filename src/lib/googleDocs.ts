import type { InterviewExportData } from "@/lib/interviewExport";

type TextRange = { startIndex: number; endIndex: number };

const appendText = (state: { text: string; index: number }, chunk: string) => {
  const startIndex = state.index;
  state.text += chunk;
  state.index += chunk.length;
  return { startIndex, endIndex: state.index } satisfies TextRange;
};

export function buildGoogleDocsRequests(data: InterviewExportData) {
  const buffer = { text: "", index: 1 };
  const titleRange = appendText(
    buffer,
    `Entretien avec ${data.agentName} par ${data.userName} le ${data.interviewDate}\n`
  );

  appendText(
    buffer,
    `Entretien du ${data.interviewDate}, Export du ${new Date().toLocaleDateString("fr-FR")}\n`
  );
  appendText(buffer, `Session : ${data.primarySessionId || "N/A"}\n`);
  appendText(
    buffer,
    `Utilisateur : ${data.userEmail} ${data.userName}\n`
  );
  appendText(
    buffer,
    `Agent : ${data.agentName} ${data.agentDescription}\n\n`
  );

  const interviewHeadingRange = appendText(buffer, "Entretien\n");

  const authorRanges: TextRange[] = [];
  if (data.messages.length === 0) {
    appendText(buffer, "Aucun message.\n\n");
  } else {
    data.messages.forEach((message) => {
      const author = message.role === "assistant" ? data.agentName : data.userName;
      const authorRange = appendText(buffer, `${author}\n`);
      authorRanges.push(authorRange);
      appendText(buffer, `${message.content ?? ""}\n\n`);
    });
  }

  const promptHeadingRange = appendText(buffer, "Prompt système\n");
  appendText(buffer, `${data.promptMarkdown ?? "Prompt indisponible."}\n`);

  const requests = [
    {
      insertText: {
        location: { index: 1 },
        text: buffer.text,
      },
    },
    {
      updateTextStyle: {
        range: titleRange,
        textStyle: {
          bold: true,
          fontSize: { magnitude: 18, unit: "PT" },
        },
        fields: "bold,fontSize",
      },
    },
    {
      updateTextStyle: {
        range: interviewHeadingRange,
        textStyle: {
          bold: true,
          fontSize: { magnitude: 14, unit: "PT" },
        },
        fields: "bold,fontSize",
      },
    },
    {
      updateTextStyle: {
        range: promptHeadingRange,
        textStyle: {
          bold: true,
          fontSize: { magnitude: 14, unit: "PT" },
        },
        fields: "bold,fontSize",
      },
    },
    ...authorRanges.map((range) => ({
      updateTextStyle: {
        range,
        textStyle: { bold: true },
        fields: "bold",
      },
    })),
  ];

  return requests;
}
