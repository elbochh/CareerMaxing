import OpenAI from "openai";
import { z, ZodTypeAny } from "zod";

export interface LlmCallOptions<T extends ZodTypeAny> {
  system: string;
  user: string;
  schema: T;
  mock: () => z.infer<T>;
  maxTokens?: number;
  temperature?: number;
}

export function llmEnabled(): boolean {
  const flag = (process.env.LLM_ENABLED || "false").toLowerCase() === "true";
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const useMock = (process.env.USE_MOCK_DATA || "true").toLowerCase() === "true";
  return flag && hasKey && !useMock;
}

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Call the LLM with strict JSON output validated against a zod schema.
 * If LLM is disabled or any error occurs, falls back to the deterministic mock
 * so the demo never breaks.
 */
export async function llmCall<T extends ZodTypeAny>(opts: LlmCallOptions<T>): Promise<z.infer<T>> {
  if (!llmEnabled()) {
    return opts.schema.parse(opts.mock());
  }
  try {
    const model = process.env.LLM_MODEL || "gpt-4o-mini";
    const completion = await getClient().chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_tokens: opts.maxTokens ?? 900,
      temperature: opts.temperature ?? 0.4,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    return opts.schema.parse(parsed);
  } catch (err) {
    console.warn("[llm] falling back to mock:", (err as Error).message);
    return opts.schema.parse(opts.mock());
  }
}
