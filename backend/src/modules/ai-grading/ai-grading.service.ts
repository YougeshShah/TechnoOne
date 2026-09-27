import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env";

// Reuses the same Anthropic key already configured for the Content
// Generator (ANTHROPIC_API_KEY) -- no new key/setup needed.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
}

function clampBand(n: any): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(9, num));
}

/**
 * Grades an IELTS Writing task essay instantly using Claude, following the
 * official band descriptors (Task Achievement, Coherence & Cohesion,
 * Lexical Resource, Grammatical Range & Accuracy). Returns null on any
 * failure so the caller can fall back to the existing manual-review queue.
 */
export async function gradeWritingEssay(params: {
  writingPrompt: string;
  minWordCount: number | null;
  wordCount: number;
  essayText: string;
}): Promise<{ score: number; feedback: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { writingPrompt, minWordCount, wordCount, essayText } = params;

  const systemPrompt =
    "You are an official IELTS Writing examiner. Grade the student's essay strictly using the real IELTS " +
    "Writing band descriptors (Task Achievement/Response, Coherence and Cohesion, Lexical Resource, " +
    "Grammatical Range and Accuracy). Give an overall band score from 0 to 9 in 0.5 increments, and concise, " +
    "actionable feedback (3-5 sentences) explaining the score and specific ways to improve. " +
    'Respond with ONLY a JSON object, no markdown, no code fences, in exactly this shape: ' +
    '{"score": <number>, "feedback": "<string>"}';

  const userPrompt =
    `Writing task prompt: ${writingPrompt}\n` +
    (minWordCount ? `Minimum word count: ${minWordCount}\n` : "") +
    `Student's word count: ${wordCount}\n\nStudent's essay:\n${essayText}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const parsed = JSON.parse(stripCodeFence(raw));
    if (typeof parsed.feedback !== "string") return null;
    return { score: clampBand(parsed.score), feedback: parsed.feedback };
  } catch {
    return null;
  }
}

/**
 * Grades an IELTS Speaking recording instantly using Gemini's multimodal
 * (audio/video-understanding) API -- transcribes the recording and scores
 * it against the four official IELTS Speaking criteria in a single call.
 * Reuses the same Gemini key already configured for the chatbot/AI
 * assistant (GEMINI_API_KEY). Returns null on any failure so the caller can
 * leave the submission as PENDING_GRADING / GRADING_FAILED.
 */
export async function gradeSpeakingRecording(params: {
  absoluteFilePath: string;
  mimeType: string;
  promptText: string;
  part: number;
}): Promise<{
  transcript: string;
  fluencyScore: number;
  lexicalScore: number;
  grammarScore: number;
  pronunciationScore: number;
  overallBand: number;
  aiFeedback: string;
} | null> {
  if (!env.gemini.apiKey) return null;
  const { absoluteFilePath, mimeType, promptText, part } = params;

  let base64Data: string;
  try {
    base64Data = fs.readFileSync(absoluteFilePath).toString("base64");
  } catch {
    return null;
  }

  const instructions =
    `You are an official IELTS Speaking examiner. Listen to this student's spoken response to IELTS Speaking ` +
    `Part ${part}, for the prompt: "${promptText}".\n\n` +
    "First transcribe exactly what the student said. Then grade it using the official IELTS Speaking band " +
    "descriptors across these four criteria, each scored 0-9 in 0.5 increments: Fluency and Coherence, " +
    "Lexical Resource, Grammatical Range and Accuracy, and Pronunciation. Give an overall band score " +
    "(the average of the four, rounded to the nearest 0.5). Give concise written feedback (3-5 sentences) " +
    "with specific, actionable improvement points.\n\n" +
    "Respond with ONLY a JSON object, no markdown, no code fences, in exactly this shape:\n" +
    '{"transcript": "<string>", "fluencyScore": <number>, "lexicalScore": <number>, ' +
    '"grammarScore": <number>, "pronunciationScore": <number>, "overallBand": <number>, "aiFeedback": "<string>"}';

  const maxAttempts = 2;
  let response: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.gemini.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructions }, { inlineData: { mimeType, data: base64Data } }] }],
        }),
      }
    );
    if (response.ok) break;
    const errText = await response.text();
    const overloaded = response.status === 503 || errText.includes("overloaded") || errText.includes("UNAVAILABLE");
    if (!overloaded || attempt === maxAttempts) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  if (!response || !response.ok) return null;

  try {
    const data = (await response.json()) as any;
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(stripCodeFence(raw));
    return {
      transcript: String(parsed.transcript ?? ""),
      fluencyScore: clampBand(parsed.fluencyScore),
      lexicalScore: clampBand(parsed.lexicalScore),
      grammarScore: clampBand(parsed.grammarScore),
      pronunciationScore: clampBand(parsed.pronunciationScore),
      overallBand: clampBand(parsed.overallBand),
      aiFeedback: String(parsed.aiFeedback ?? ""),
    };
  } catch {
    return null;
  }
}
