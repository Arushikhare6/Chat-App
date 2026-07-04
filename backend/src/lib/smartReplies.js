import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in backend/.env");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a smart reply assistant embedded inside a real-time chat application.

Your job is to read the recent conversation and suggest EXACTLY 3 short, natural replies the current user could send next.

Rules:
- Each reply must contain fewer than 8 words.
- Use the same language as the conversation.
- Replies should sound natural.
- Do not repeat previous messages.
- Do not use numbering.
- Do not use markdown.
- Return ONLY valid JSON.

Response format:
{"replies":["reply1","reply2","reply3"]}
`;

/**
 * Generate 3 smart reply suggestions.
 * @param {Array<{role:"me"|"them", text:string}>} recentMessages
 * @returns {Promise<string[]>}
 */
export async function generateSmartReplies(recentMessages) {
  const transcript = recentMessages
    .map((m) => `${m.role === "me" ? "Me" : "Them"}: ${m.text}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}

Conversation:

${transcript}

Generate exactly 3 reply suggestions.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const raw = response.text.trim();

    // Remove markdown fences if Gemini adds them
    const cleaned = raw
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error("Gemini returned invalid JSON");
      }

      parsed = JSON.parse(match[0]);
    }

    const replies = Array.isArray(parsed.replies)
      ? parsed.replies.filter(
          (reply) =>
            typeof reply === "string" &&
            reply.trim().length > 0
        )
      : [];

    if (replies.length < 3) {
      throw new Error("Gemini returned fewer than 3 replies");
    }

    return replies.slice(0, 3);
  } catch (error) {
    console.error("Gemini Smart Reply Error:", error);

    return [
      "Sounds good!",
      "Tell me more.",
      "Okay, thanks!",
    ];
  }
}