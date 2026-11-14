import { env } from "../../../config/env";
import { AppError } from "../../../common/errors/AppError";
import { precedentService } from "../../precedent/service/precedent.service";
import { ukPrecedentService } from "../../uk-precedent/service/uk-precedent.service";
import { HistoryMessage } from "../dto/ai-assistant.dto";

const STOP_WORDS = new Set([
  "what", "is", "the", "in", "of", "and", "to", "for", "on", "with", "about", "how", "can", "you", "tell", "me",
  "explain", "case", "cases", "law", "nepal", "nepali", "uk", "britain", "british", "precedent", "precedents",
  "najir", "को", "मा", "ले", "र", "तथा", "के", "कसो", "हुन्छ", "छ", "हो", "भने", "गर्दा", "सम्बन्धी", "नजिर", "मुद्दा",
  "यो", "त्यो", "कसरी", "कति", "अनुसार", "बारे", "गर्ने", "दिने", "भएमा", "गरेको", "लागि", "पनि", "वा", "कि", "त", "नि",
  "ma", "ko", "le", "ra", "ke", "k", "huncha", "hunxa", "cha", "xa", "ho", "yo", "tyo", "kasari", "kasto"
]);

// Zero-token fast local keyword extractor so we never waste an extra LLM call
function extractSmartKeywords(question: string, history: HistoryMessage[]): { nepaliQuery: string; ukQuery: string } {
  const combinedSource = question.trim().split(/\s+/).length <= 4 && history.length > 0
    ? `${history[history.length - 1].text.slice(0, 120)} ${question}`
    : question;

  const cleaned = combinedSource
    .replace(/[?!.,;:"'()\[\]{}\/\\|-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));

  const coreKeywords = cleaned.slice(0, 6).join(" ") || question.trim();

  // Map common Nepali legal terms to English equivalents for UK search if question is in Devanagari/Roman Nepali
  const legalMap: Record<string, string> = {
    "अंशबण्डा": "partition family property",
    "अंश": "ancestral property division",
    "लिखत": "deed cancellation fraud",
    "जबरजस्ती": "sexual offence consent",
    "करणी": "rape burden of proof",
    "कर्तव्य": "homicide murder",
    "ज्यान": "manslaughter criminal",
    "ठगी": "fraud misrepresentation",
    "चेक": "dishonour of cheque negotiable",
    "सम्बन्ध": "divorce matrimonial",
    "विच्छेद": "divorce family settlement",
    "हदम्याद": "limitation period statute",
    "रिट": "judicial review writ",
    "करार": "breach of contract",
    "जग्गा": "land property dispute",
    "सगोल": "joint family property",
  };

  let englishBoost: string[] = [];
  for (const [np, en] of Object.entries(legalMap)) {
    if (combinedSource.includes(np)) englishBoost.push(en);
  }

  const asciiWords = cleaned.filter((w) => /^[a-zA-Z]+$/.test(w));
  const ukQuery = englishBoost.length > 0
    ? `${englishBoost.slice(0, 2).join(" ")} ${asciiWords.slice(0, 3).join(" ")}`.trim()
    : asciiWords.slice(0, 5).join(" ") || coreKeywords;

  return {
    nepaliQuery: coreKeywords,
    ukQuery: ukQuery || "contract property law",
  };
}

async function callGemini(prompt: string, maxAttempts = 3): Promise<string> {
  let response: Response | null = null;
  let lastErrText = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.gemini.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    if (!response.ok && response.status === 404) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
    }
    if (response.ok) break;
    lastErrText = await response.text();
    const isOverloaded =
      response.status === 503 ||
      response.status === 429 ||
      lastErrText.includes("UNAVAILABLE") ||
      lastErrText.includes("overloaded");
    if (!isOverloaded || attempt === maxAttempts) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  if (!response || !response.ok) {
    throw AppError.badRequest(
      `AI assistant is temporarily busy. Please try again in a moment. (${lastErrText.slice(0, 150)})`
    );
  }

  const data = (await response.json()) as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const aiAssistantService = {
  async ask(question: string, lawFirmId: string | null, history: HistoryMessage[] = []) {
    if (!env.gemini.apiKey) {
      throw AppError.badRequest("AI assistant is not configured. Contact TechnoOne support.");
    }

    const { nepaliQuery, ukQuery } = extractSmartKeywords(question, history);

    // Token-efficient retrieval: 5 Nepali + 5 UK cases with concise 1200-char excerpts
    const [nepaliRes, ukRes] = await Promise.all([
      precedentService
        .search({ search: nepaliQuery, page: 1, limit: 5 } as any, lawFirmId)
        .then(async (res) => {
          if (res.items.length === 0 && nepaliQuery !== question) {
            return precedentService.search({ search: question, page: 1, limit: 5 } as any, lawFirmId);
          }
          return res;
        })
        .catch(() => ({ items: [] as any[] })),
      ukPrecedentService
        .search(ukQuery, 1, 5)
        .catch(() => ({ items: [] as any[] })),
    ]);

    const nepaliItems = nepaliRes.items || [];
    const ukItems = (ukRes.items || []).slice(0, 5);

    const nepaliContext = nepaliItems
      .map(
        (p: any, i: number) =>
          `[Nepali Najir ${i + 1}] ${p.title} | Type: ${p.caseType ?? p.category ?? "N/A"} | Date: ${p.decisionDate ?? "N/A"} | NKP: ${p.citation ?? p.nkpNumber ?? "N/A"}\nExcerpt: ${(p.fullText || p.fullContent || p.summary || "").slice(0, 1200)}`
      )
      .join("\n\n");

    const ukContext = ukItems
      .map(
        (u: any, i: number) =>
          `[UK Case ${i + 1}] ${u.title} | Citation: ${u.citation || "N/A"} | Court: ${u.court || "UK Court"} | Date: ${u.publishedDate || "N/A"}\nExcerpt: ${(u.summary || "").slice(0, 900)}`
      )
      .join("\n\n");

    const conversationTranscript = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Lawyer" : "Agent"}: ${m.text.slice(0, 600)}`)
      .join("\n");

    const prompt = `You are TechnoOne's Conversational Legal Research Agent for lawyers.
Analyze the lawyer's question or follow-up cross-question using the retrieved Supreme Court of Nepal Precedents (नेपालको नजिर), UK Case Law (बेलायती नजिर), and conversation history.

RULES:
1. Direct & Agentic Response: Directly answer what is asked (analysis, comparison, cross-question, or courtroom arguments).
2. Cite Both Jurisdictions Clearly:
   - **🇳🇵 नेपालको सर्वोच्च अदालतको नजिर (Nepali Precedents):** Cite exact Title, Case Type/NKP, and Decision Date from [Nepali Najir] records. Never invent Nepali citations.
   - **🇬🇧 UK Case Law (बेलायती नजिर):** Cite exact Title, Neutral Citation, Court, and Date from [UK Case] records.
   - **⚖️ Comparative Takeaway:** Briefly synthesize how both jurisdictions apply to the lawyer's query.
3. Language Match: Reply in the exact language/script used by the lawyer (Devanagari Nepali, Roman Nepali, or English).

HISTORY:
${conversationTranscript || "(None)"}

NEPALI PRECEDENTS:
${nepaliContext || "(No direct match in DB)"}

UK CASE LAW:
${ukContext || "(No direct match in UK feed)"}

QUESTION: ${question}`;

    const answer = (await callGemini(prompt, 3)) || "No answer generated.";

    const combinedSources = [
      ...nepaliItems.map((p: any) => ({
        id: `np-${p.id}`,
        jurisdiction: "NEPAL" as const,
        title: `🇳🇵 ${p.title}`,
        caseType: p.caseType ?? p.category ?? null,
        decisionDate: p.decisionDate ?? null,
        citation: p.citation ?? null,
        url: null,
      })),
      ...ukItems.map((u: any, idx: number) => ({
        id: `uk-${idx}-${u.citation || u.title}`,
        jurisdiction: "UK" as const,
        title: `🇬🇧 ${u.title}${u.citation ? ` (${u.citation})` : ""}`,
        caseType: u.court || "UK Court",
        decisionDate: u.publishedDate || null,
        citation: u.citation || null,
        url: u.url || null,
      })),
    ];

    return {
      answer,
      sources: combinedSources,
    };
  },
};
