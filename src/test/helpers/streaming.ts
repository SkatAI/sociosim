/**
 * Creates a mock streaming response in SSE format
 * Simplified: returns complete message, not incremental chunks
 */
export function createMockStreamingResponse(messageText: string) {
  const encoder = new TextEncoder();

  // SSE format: "data: {json}\n\n"
  const chunks = [
    `data: ${JSON.stringify({
      type: "message",
      event: {
        content: {
          parts: [{ text: messageText }],
        },
      },
    })}\n\n`,
    `data: ${JSON.stringify({
      type: "done",
      event: {
        total_input_tokens: 10,
        total_output_tokens: 20,
      },
    })}\n\n`,
  ];

  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => {
        controller.enqueue(encoder.encode(chunk));
      });
      controller.close();
    },
  });

  return {
    ok: true,
    body: stream,
    headers: new Headers({
      "content-type": "text/event-stream",
    }),
  };
}
