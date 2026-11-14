import { useState, useRef, useEffect } from "react";
import { Box, Button, TextField, Typography, Paper, Chip, CircularProgress, Alert } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToyOutlined";
import PersonIcon from "@mui/icons-material/PersonOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { aiAssistantApi, AiAssistantSource, AiHistoryMessage } from "../../api/aiAssistant.api";

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: AiAssistantSource[];
  isError?: boolean;
  isLimitError?: boolean;
}

const SAMPLE_PROMPTS = [
  "अंशबण्डा सगोलको सम्पत्ति लिखत बदर नजिर तुलना",
  "Cheque bounce dishonour burden of proof Nepal vs UK",
  "जबरजस्ती करणी होस्टाइल साक्षी प्रमाणको मूल्यांकन",
  "Breach of contract specific performance damages precedent",
];

export function AiAssistantPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: ({ q, history }: { q: string; history: AiHistoryMessage[] }) =>
      aiAssistantApi.ask(q, history),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, sources: data.sources }]);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.message || err?.message || "Something went wrong.";
      const isLimit = errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded") || err?.response?.status === 403;
      if (isLimit) {
        setIsLimitReached(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Limit reached · Resets soon. Your organization has exhausted its AI query token allowance for this billing cycle.",
            isLimitError: true,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: errMsg, isError: true }]);
      }
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed || ask.isPending || isLimitReached) return;
    const history: AiHistoryMessage[] = messages
      .filter((m) => !m.isError && !m.isLimitError)
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    ask.mutate({ q: trimmed, history });
    setQuestion("");
  };

  return (
    <Box sx={{ maxWidth: 900, height: "calc(100vh - 140px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          AI Legal Research Agent (Nepal 🇳🇵 & UK 🇬🇧)
        </Typography>
        {messages.length > 0 && (
          <Button size="small" color="inherit" startIcon={<DeleteSweepIcon />} onClick={() => { setMessages([]); setIsLimitReached(false); }}>
            Clear Chat
          </Button>
        )}
      </Box>

      {isLimitReached && (
        <Alert
          severity="warning"
          icon={<WorkspacePremiumIcon />}
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={() => navigate("/subscription")}>
              Upgrade Plan
            </Button>
          }
          sx={{ mb: 2, alignItems: "center", bgcolor: "#FEF3C7", color: "#92400E", border: "1px solid #F59E0B" }}
        >
          <strong>Limit reached · AI Token Allowance Exhausted.</strong> Please upgrade your subscription plan to continue research.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Analyzes both Supreme Court of Nepal नजिर and UK Case Law with comparative citations & cross-question memory.
      </Typography>

      <Paper
        elevation={0}
        sx={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 2, p: 2, overflow: "auto", mb: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {messages.length === 0 && (
          <Box sx={{ my: "auto", mx: "auto", maxWidth: 620, textAlign: "center", p: 2 }}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, bgcolor: "#EFF6FF", color: "#1E40AF", px: 2, py: 1, borderRadius: 2, mb: 2 }}>
              <TipsAndUpdatesIcon fontSize="small" />
              <Typography variant="caption" fontWeight={600}>
                Smart Prompt Tip: Use specific legal keywords (e.g. "अंशबण्डा सगोलको सम्पत्ति लिखत बदर") for faster, sharper Nepal + UK precedent matches!
              </Typography>
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Try clicking a sample short-key legal prompt below:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
              {SAMPLE_PROMPTS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  clickable
                  onClick={() => sendQuery(p)}
                  sx={{ bgcolor: "#F9FAFB", border: "1px solid #D1D5DB" }}
                />
              ))}
            </Box>
          </Box>
        )}
        {messages.map((m, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            {m.role === "assistant" ? <SmartToyIcon color="primary" sx={{ mt: 0.5 }} /> : <PersonIcon sx={{ mt: 0.5 }} />}
            <Box sx={{ flex: 1 }}>
              {m.isLimitError ? (
                <Alert severity="warning" action={<Button size="small" onClick={() => navigate("/subscription")}>Upgrade</Button>} sx={{ mb: 1 }}>
                  {m.text}
                </Alert>
              ) : m.isError ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {m.text}
                </Alert>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {m.text}
                </Typography>
              )}
              {m.sources && m.sources.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    Referenced Precedents (Nepal & UK):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {m.sources.map((s) => (
                      <Chip
                        key={s.id}
                        label={s.title}
                        size="small"
                        variant="outlined"
                        color={s.jurisdiction === "UK" ? "secondary" : "primary"}
                        clickable={!!s.url}
                        onClick={() => s.url && window.open(s.url, "_blank", "noopener,noreferrer")}
                        deleteIcon={s.url ? <OpenInNewIcon fontSize="small" /> : undefined}
                        onDelete={s.url ? () => window.open(s.url!, "_blank", "noopener,noreferrer") : undefined}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ))}
        {ask.isPending && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <SmartToyIcon color="primary" />
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Searching Nepali नजिर & UK Case Law and analyzing...
            </Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Paper>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={isLimitReached ? "AI token limit reached. Please upgrade plan." : "Enter legal keywords or ask a follow-up cross-question..."}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendQuery(question)}
          disabled={ask.isPending || isLimitReached}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={() => sendQuery(question)} disabled={!question.trim() || ask.isPending || isLimitReached}>
          Ask
        </Button>
      </Box>
    </Box>
  );
}
