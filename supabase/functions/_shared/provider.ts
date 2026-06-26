// AI provider abstraction. OpenAI (Responses API) is implemented now; the
// AiProvider interface lets Anthropic be added later without touching callers.
// Reads provider/model/key from server-only env — no client ever sees a key.

export type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; file_url?: string; filename?: string; file_data?: string };

export interface AiTurn {
  role: "system" | "user" | "assistant";
  content: ContentPart[];
}

export interface JsonSchemaSpec {
  name: string;
  schema: Record<string, unknown>;
}

export interface GenerateOptions {
  model: string;
  input: AiTurn[];
  jsonSchema?: JsonSchemaSpec;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  parsed?: unknown;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface AiProvider {
  name: "openai" | "anthropic";
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}

const OPENAI_URL = "https://api.openai.com/v1/responses";

/** Extract concatenated output text from a Responses API payload. */
function extractText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const out: string[] = [];
  const output = payload.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (Array.isArray(content)) {
        for (const c of content) {
          const part = c as { type?: string; text?: string };
          if ((part.type === "output_text" || part.type === "text") && typeof part.text === "string") {
            out.push(part.text);
          }
        }
      }
    }
  }
  return out.join("");
}

function openAiProvider(apiKey: string): AiProvider {
  return {
    name: "openai",
    async generate(opts: GenerateOptions): Promise<GenerateResult> {
      const body: Record<string, unknown> = {
        model: opts.model,
        input: opts.input,
        max_output_tokens: opts.maxOutputTokens ?? 1200,
      };
      if (typeof opts.temperature === "number") body.temperature = opts.temperature;
      if (opts.jsonSchema) {
        body.text = {
          format: {
            type: "json_schema",
            name: opts.jsonSchema.name,
            strict: true,
            schema: opts.jsonSchema.schema,
          },
        };
      }
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
      }
      const payload = (await res.json()) as Record<string, unknown>;
      const text = extractText(payload);
      const usage = (payload.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
      let parsed: unknown;
      if (opts.jsonSchema && text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = undefined;
        }
      }
      return {
        text,
        parsed,
        tokensIn: usage.input_tokens ?? 0,
        tokensOut: usage.output_tokens ?? 0,
        model: (payload.model as string) ?? opts.model,
      };
    },
  };
}

/** Returns the configured provider, or null when AI is disabled / unkeyed. */
export function getProvider(): AiProvider | null {
  if ((Deno.env.get("AI_ENABLED") ?? "true").toLowerCase() === "false") return null;
  const which = (Deno.env.get("AI_PROVIDER") ?? "openai").toLowerCase();
  if (which === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    return key ? openAiProvider(key) : null;
  }
  // Anthropic: intentionally not implemented yet. Set AI_PROVIDER=openai for now.
  return null;
}

export const MODELS = {
  chat: () => Deno.env.get("AI_CHAT_MODEL") ?? "gpt-4.1-mini",
  vision: () => Deno.env.get("AI_VISION_MODEL") ?? "gpt-4.1-mini",
  summary: () => Deno.env.get("AI_SUMMARY_MODEL") ?? "gpt-4.1-mini",
};
