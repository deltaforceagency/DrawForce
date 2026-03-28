import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a diagram generation engine. Given a user's request, output ONLY a valid JSON object describing the diagram. No markdown, no explanation, no code fences — just raw JSON.

The JSON schema is:
{
  "title": "short title",
  "direction": "TD" or "LR",
  "nodes": [
    { "id": "unique_id", "label": "Display Label", "shape": "rect"|"diamond"|"circle"|"rounded", "group": "optional_group_name" }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id", "label": "optional edge label" }
  ],
  "groups": [
    { "id": "group_name", "label": "Display Name" }
  ]
}

Rules:
- Use descriptive labels specific to what the user asked for
- Keep it clean: 5-12 nodes max for clarity
- "direction": "TD" for top-down flows, "LR" for left-to-right pipelines
- Use "diamond" shape for decisions/conditions
- Use "circle" shape for start/end terminals
- Use "rounded" for processes/actions
- Use "rect" for data/services/systems
- Group related nodes together when it makes sense
- Add meaningful edge labels for decisions (e.g. "Yes", "No", "Success", "Fail")
- Every edge must reference valid node IDs
- Node IDs must be simple strings (letters, numbers, underscores only)

Example for "Login flow":
{"title":"Login Flow","direction":"TD","nodes":[{"id":"start","label":"User Visits Site","shape":"rounded"},{"id":"enter","label":"Enter Credentials","shape":"rect"},{"id":"check","label":"Valid?","shape":"diamond"},{"id":"session","label":"Create Session","shape":"rect"},{"id":"error","label":"Show Error","shape":"rounded"},{"id":"dashboard","label":"Redirect to Dashboard","shape":"rounded"}],"edges":[{"from":"start","to":"enter"},{"from":"enter","to":"check"},{"from":"check","to":"session","label":"Yes"},{"from":"check","to":"error","label":"No"},{"from":"session","to":"dashboard"},{"from":"error","to":"enter"}],"groups":[]}

CRITICAL: Output ONLY the JSON. No other text.`;

const EDIT_SYSTEM_PROMPT = `You are a diagram editing engine. You receive an existing diagram as JSON and a user's edit request. Apply the changes and output ONLY the updated JSON. No explanation, no code fences.

Keep the overall structure intact. Only change what the user asks for. Use the same JSON schema as the original.

CRITICAL: Output ONLY the updated JSON. No other text.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, existingDiagram, mode } = body;

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const isEdit = mode === "edit" && existingDiagram;

    const messages: Anthropic.MessageParam[] = isEdit
      ? [
          {
            role: "user",
            content: `Current diagram JSON:\n${existingDiagram}\n\nEdit request: ${prompt}\n\nOutput ONLY the updated JSON.`,
          },
        ]
      : [
          {
            role: "user",
            content: prompt,
          },
        ];

    // Non-streaming for reliability — JSON must be complete to parse
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      temperature: 0.2,
      system: isEdit ? EDIT_SYSTEM_PROMPT : SYSTEM_PROMPT,
      messages,
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }

    // Clean any markdown fences Claude might have added
    text = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Validate it's parseable JSON
    try {
      const parsed = JSON.parse(text);
      return Response.json({ diagram: parsed, raw: text });
    } catch {
      return Response.json(
        { error: "Claude returned invalid JSON", raw: text },
        { status: 422 }
      );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
