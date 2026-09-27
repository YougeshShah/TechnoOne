import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Chip,
  CircularProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  InputAdornment,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import { usePrecedentSearch, usePrecedentDetail, usePrecedentCategories } from "../../hooks/usePrecedents";

function HighlightedContent({ text, term, activeMatchIndex }: { text: string; term: string; activeMatchIndex: number }) {
  const matchRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    matchRefs.current = [];
  }, [text, term]);

  useEffect(() => {
    matchRefs.current[activeMatchIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex, term]);

  if (!term.trim()) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  let matchCounter = -1;
  return (
    <>
      {parts.map((part, i) => {
        if (part.toLowerCase() !== term.toLowerCase()) return part;
        matchCounter++;
        const isActive = matchCounter === activeMatchIndex;
        return (
          <mark key={i} ref={(el) => (matchRefs.current[matchCounter] = el)} style={{ backgroundColor: isActive ? "#FB923C" : "#FEF08A" }}>
            {part}
          </mark>
        );
      })}
    </>
  );
}

function countMatches(text: string, term: string) {
  if (!term.trim()) return 0;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(escaped, "gi")) ?? []).length;
}

export function PrecedentSearchPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [inDocSearch, setInDocSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const { data: categories } = usePrecedentCategories();
  const { data: results, isLoading } = usePrecedentSearch({ search: search || undefined, category: category || undefined, page, limit: 20 });
  const { data: detail, isLoading: loadingDetail } = usePrecedentDetail(viewingId ?? undefined);

  useEffect(() => setActiveMatchIndex(0), [inDocSearch, viewingId]);

  const handleSearchSubmit = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <GavelIcon color="action" />
        <Typography variant="h5" fontWeight={700}>
          नजिर खोज (Precedent Search)
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        सर्वोच्च अदालतका फैसला हरू — कुनैपनि शब्दले खोज्न मिल्छ। सबै फैसला अदालतबाट जारी भए जस्तै, unchanged देखाइन्छ।
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, position: "sticky", top: 0, zIndex: 10, bgcolor: "#fff", py: 1.5, borderBottom: "1px solid #E5E7EB" }}>
        <TextField
          fullWidth
          placeholder="कुनैपनि शब्द, पक्षको नाम, मुद्दा नं. खोज्नुहोस्..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
        <Button variant="contained" onClick={handleSearchSubmit} sx={{ px: 4 }}>
          खोज्नुहोस्
        </Button>
      </Box>

      <TextField
        select
        label="Category"
        size="small"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setPage(1);
        }}
        sx={{ minWidth: 240, mb: 3 }}
      >
        <MenuItem value="">All Categories</MenuItem>
        {categories?.map((c) => (
          <MenuItem key={c} value={c}>
            {c}
          </MenuItem>
        ))}
      </TextField>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && results?.items.length === 0 && (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid #E5E7EB", borderRadius: 3 }}>
          <Typography color="text.secondary">कुनै नजिर भेटिएन।</Typography>
        </Paper>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {results?.items.map((p) => (
          <Paper
            key={p.id}
            elevation={0}
            onClick={() => {
              setViewingId(p.id);
              setInDocSearch("");
            }}
            sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, cursor: "pointer", "&:hover": { borderColor: "#93C5FD" } }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {p.title}
              </Typography>
              {p.category && <Chip label={p.category} size="small" color="primary" variant="outlined" sx={{ flexShrink: 0 }} />}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
              {p.court && <Typography variant="caption" color="text.secondary">{p.court}</Typography>}
              {p.caseNumber && <Typography variant="caption" color="text.secondary">{p.caseNumber}</Typography>}
              {p.decisionDate && <Typography variant="caption" color="text.secondary">मिति: {p.decisionDate}</Typography>}
            </Box>
            {(p.petitioner || p.respondent) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {p.petitioner && `निवेदक: ${p.petitioner}`}
                {p.petitioner && p.respondent && " वि. "}
                {p.respondent && `विपक्षी: ${p.respondent}`}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>

      {results && results.pagination.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination count={results.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      <Dialog open={!!viewingId} onClose={() => setViewingId(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ pr: 2 }}>
            {detail?.title}
          </Typography>
          <IconButton onClick={() => setViewingId(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {detail && !loadingDetail && (
            <>
              <Box sx={{ display: "flex", gap: 1, mb: 2, position: "sticky", top: 0, zIndex: 10, bgcolor: "#fff", py: 1, borderBottom: "1px solid #E5E7EB" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="यो फैसला भित्र शब्द खोज्नुहोस्..."
                  value={inDocSearch}
                  onChange={(e) => setInDocSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                {inDocSearch.trim() && (
                  <>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", px: 1 }}>
                      {countMatches(detail.fullContent, inDocSearch) > 0
                        ? `${activeMatchIndex + 1} / ${countMatches(detail.fullContent, inDocSearch)}`
                        : "0 / 0"}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setActiveMatchIndex((i) => (i - 1 + countMatches(detail.fullContent, inDocSearch)) % countMatches(detail.fullContent, inDocSearch))}
                    >
                      <KeyboardArrowUpIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => setActiveMatchIndex((i) => (i + 1) % countMatches(detail.fullContent, inDocSearch))}>
                      <KeyboardArrowDownIcon />
                    </IconButton>
                  </>
                )}
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {detail.category && <Chip label={detail.category} size="small" color="primary" />}
                {detail.court && <Chip label={detail.court} size="small" variant="outlined" />}
                {detail.decisionDate && <Chip label={`मिति: ${detail.decisionDate}`} size="small" variant="outlined" />}
              </Box>

              <Typography
                variant="body2"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                sx={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.9,
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                }}
              >
                <HighlightedContent text={detail.fullContent} term={inDocSearch} activeMatchIndex={activeMatchIndex} />
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, fontStyle: "italic" }}>
                यो फैसलाको पाठ copy/select गर्न मिल्दैन।
              </Typography>

              {detail.sourceUrl && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
                  स्रोत: {detail.sourceUrl}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
