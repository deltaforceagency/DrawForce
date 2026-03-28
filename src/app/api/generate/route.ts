import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a diagram generation assistant for DrawForce, a whiteboard app. Given a user's request, generate ONLY valid Mermaid syntax. No explanations, no markdown code fences, no \`\`\` — just the raw Mermaid code.

Rules:
- Use descriptive, specific labels based on what the user ACTUALLY asked for
- Keep diagrams clean: max 15 nodes for clarity
- Use appropriate diagram types:
  - flowchart TD for top-down processes, workflows, decision trees
  - flowchart LR for left-to-right pipelines
  - graph TD for hierarchies, org charts, tree structures
  - sequenceDiagram for interactions between systems/people
  - erDiagram for data models and database schemas
  - mindmap for brainstorming and topic exploration
  - timeline for chronological events
- Use subgraphs to group related concepts when appropriate
- Add meaningful edge labels where they help understanding
- For flowcharts: use standard Mermaid node shapes
  - [text] for rectangles
  - {text} for diamonds/decisions
  - (text) for rounded rectangles
  - ((text)) for circles
  - >text] for flags
- Use different node IDs (A, B, C... or descriptive like login, validate, etc.)

Examples of good output:
1. "Login flow" →
flowchart TD
    A[User visits site] --> B[Enter credentials]
    B --> C{Valid?}
    C -->|Yes| D[Create session]
    C -->|No| E[Show error]
    D --> F[Redirect to dashboard]
    E --> B

2. "Microservice architecture" →
flowchart TD
    subgraph Client
        A[Web App]
        B[Mobile App]
    end
    subgraph Gateway
        C[API Gateway]
    end
    subgraph Services
        D[Auth Service]
        E[User Service]
        F[Payment Service]
    end
    subgraph Data
        G[(PostgreSQL)]
        H[(Redis Cache)]
    end
    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    D --> G
    E --> G
    F --> G
    D --> H

IMPORTANT: Output ONLY the Mermaid code. No explanation before or after.`;

const EDIT_SYSTEM_PROMPT = `You are a diagram editing assistant. The user has an existing Mermaid diagram and wants to modify it. Apply their requested changes and return ONLY the updated Mermaid code. No explanations, no markdown code fences.

Keep the overall structure intact. Only change what the user asks for.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, existingMermaid, mode } = body;

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const isEdit = mode === "edit" && existingMermaid;

    const messages: Anthropic.MessageParam[] = isEdit
      ? [
          {
            role: "user",
            content: `Here is the current Mermaid diagram:\n\n${existingMermaid}\n\nUser's edit request: ${prompt}\n\nReturn ONLY the updated Mermaid code.`,
          },
        ]
      : [
          {
            role: "user",
            content: prompt,
          },
        ];

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            temperature: 0.3,
            system: isEdit ? EDIT_SYSTEM_PROMPT : SYSTEM_PROMPT,
            messages,
            stream: true,
          });

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = JSON.stringify({ type: "delta", text: event.delta.text }) + "\n";
              controller.enqueue(encoder.encode(chunk));
            }
          }

          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "done" }) + "\n")
          );
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", error: errorMsg }) + "\n"
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
