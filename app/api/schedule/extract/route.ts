import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const slotSchema = z.object({
  day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(24),
  label: z.string().min(1).max(120),
});

const responseSchema = z.object({
  slots: z.array(slotSchema),
  notes: z.string().optional(),
});

const SYSTEM = `You are a precise schedule-extraction agent.
You are given an image of a student's weekly class schedule.
Your only job is to read it and return JSON describing the busy class blocks.

Rules:
- Use 24h hours as integers (e.g. 1pm -> 13, 9am -> 9). If a block ends at the start of the next hour (e.g. 9:50 displayed in a 10am row), round to the row label.
- day must be one of: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
- Do NOT invent classes. Only include blocks that clearly appear in the image.
- Use the visible class name (or text on the block) as label. Strip leading checkmark/icons. Trim whitespace.
- If a class appears on multiple days, return one slot per day.
- If two classes overlap or stack on the same day/time, return both.
- If the image is ambiguous, prefer fewer slots over wrong slots, and explain in notes.

Return strict JSON of shape:
{
  "slots": [ { "day": "Mon", "startHour": 8, "endHour": 9, "label": "Human-Centred AI" } ],
  "notes": "optional short notes"
}`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "openai_not_configured",
        message:
          "Set OPENAI_API_KEY in .env.local to use schedule image extraction. You can still add classes manually.",
      },
      { status: 400 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const image = String(body?.image || "");
  if (!image.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "invalid_image", message: "Send a base64 data URL like data:image/png;base64,..." },
      { status: 400 },
    );
  }
  if (image.length > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "image_too_large", message: "Please upload an image under 6 MB." },
      { status: 400 },
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the weekly schedule from this image. Return JSON only.",
            },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    const result = responseSchema.parse(parsed);
    // Drop zero-length and obviously broken slots
    const slots = result.slots.filter(
      (s) => s.endHour > s.startHour && s.label.trim().length > 0,
    );
    return NextResponse.json({ slots, notes: result.notes ?? null });
  } catch (err) {
    console.warn("[schedule.extract] failed:", (err as Error).message);
    return NextResponse.json(
      {
        error: "extraction_failed",
        message:
          "Could not read the schedule reliably. Try a clearer image or add classes manually.",
      },
      { status: 502 },
    );
  }
}
