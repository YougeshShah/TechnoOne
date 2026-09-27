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
  DialogActions,
  IconButton,
  InputAdornment,
  Button,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/SaveOutlined";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import GavelIcon from "@mui/icons-material/GavelOutlined";
import AddIcon from "@mui/icons-material/AddCircleOutline";
import { usePrecedentSearch, usePrecedentDetail, usePrecedentCategories, useCreatePrecedent, useUpdatePrecedent, useDeletePrecedent } from "../../hooks/usePrecedents";
import { CreatePrecedentPayload, UpdatePrecedentPayload } from "../../api/precedent.api";

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
  const updateMutation = useUpdatePrecedent();
  const deleteMutation = useDeletePrecedent();
  const createMutation = useCreatePrecedent();

  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<UpdatePrecedentPayload>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const emptyCreateValues: CreatePrecedentPayload = { title: "", fullContent: "" };
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<CreatePrecedentPayload>(emptyCreateValues);

  const handleCreate = () => {
    createMutation.mutate(createValues, {
      onSuccess: () => {
        setCreateOpen(false);
        setCreateValues(emptyCreateValues);
      },
    });
  };

  useEffect(() => {
    if (detail && editMode) {
      setEditValues({
        title: detail.title,
        caseType: detail.caseType ?? undefined,
        category: detail.category ?? undefined,
        court: detail.court ?? undefined,
        benchType: detail.benchType ?? undefined,
        judges: detail.judges ?? undefined,
        decisionDate: detail.decisionDate ?? undefined,
        caseNumber: detail.caseNumber ?? undefined,
        petitioner: detail.petitioner ?? undefined,
        respondent: detail.respondent ?? undefined,
        fullContent: detail.fullContent,
      });
    }
  }, [detail, editMode]);

  const handleSaveEdit = () => {
    if (!viewingId) return;
    updateMutation.mutate({ id: viewingId, payload: editValues }, { onSuccess: () => setEditMode(false) });
  };

  const handleDelete = () => {
    if (!viewingId) return;
    deleteMutation.mutate(viewingId, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setViewingId(null);
      },
    });
  };

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
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setCreateValues(emptyCreateValues);
            setCreateOpen(true);
          }}
          sx={{ px: 3, whiteSpace: "nowrap" }}
        >
          नयाँ नजिर थप्नुहोस्
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
              setEditMode(false);
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

      <Dialog
        open={!!viewingId}
        onClose={() => {
          setViewingId(null);
          setEditMode(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ pr: 2, flex: 1 }}>
            {detail?.title}
          </Typography>
          {!editMode && (
            <>
              <IconButton onClick={() => setEditMode(true)} title="Edit">
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => setDeleteConfirmOpen(true)} title="Delete" color="error">
                <DeleteIcon />
              </IconButton>
            </>
          )}
          <IconButton
            onClick={() => {
              setViewingId(null);
              setEditMode(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {detail && !loadingDetail && editMode && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {updateMutation.isError && <Alert severity="error">{(updateMutation.error as any)?.response?.data?.message || "Update failed"}</Alert>}
              <TextField label="Title" fullWidth value={editValues.title ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Category" fullWidth value={editValues.category ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, category: e.target.value }))} />
                <TextField label="Case Type" fullWidth value={editValues.caseType ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, caseType: e.target.value }))} />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Court" fullWidth value={editValues.court ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, court: e.target.value }))} />
                <TextField label="Bench Type" fullWidth value={editValues.benchType ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, benchType: e.target.value }))} />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Case Number" fullWidth value={editValues.caseNumber ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, caseNumber: e.target.value }))} />
                <TextField label="Decision Date" fullWidth value={editValues.decisionDate ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, decisionDate: e.target.value }))} />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Petitioner" fullWidth value={editValues.petitioner ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, petitioner: e.target.value }))} />
                <TextField label="Respondent" fullWidth value={editValues.respondent ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, respondent: e.target.value }))} />
              </Box>
              <TextField label="Judges" fullWidth value={editValues.judges ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, judges: e.target.value }))} />
              <TextField
                label="Full Judgment Text"
                fullWidth
                multiline
                rows={16}
                value={editValues.fullContent ?? ""}
                onChange={(e) => setEditValues((v) => ({ ...v, fullContent: e.target.value }))}
                helperText="Public court record — edit only to fix scraping/formatting errors, never to change the substance of the judgment."
              />
            </Box>
          )}

          {detail && !loadingDetail && !editMode && (
            <>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
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

              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                <HighlightedContent text={detail.fullContent} term={inDocSearch} activeMatchIndex={activeMatchIndex} />
              </Typography>

              {detail.sourceUrl && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
                  स्रोत: {detail.sourceUrl}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        {editMode && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditMode(false)}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Precedent?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{detail?.title}" स्थायी रूपमा हटाइनेछ। यो undo गर्न सकिँदैन।
          </Typography>
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(deleteMutation.error as any)?.response?.data?.message || "Delete failed"}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>नयाँ नजिर थप्नुहोस् (Add New Precedent)</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {createMutation.isError && (
              <Alert severity="error">{(createMutation.error as any)?.response?.data?.message || "Create failed"}</Alert>
            )}
            <TextField
              label="Title *"
              fullWidth
              value={createValues.title}
              onChange={(e) => setCreateValues((v) => ({ ...v, title: e.target.value }))}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Category" fullWidth value={createValues.category ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, category: e.target.value }))} />
              <TextField label="Case Type" fullWidth value={createValues.caseType ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, caseType: e.target.value }))} />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Court" fullWidth value={createValues.court ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, court: e.target.value }))} />
              <TextField label="Bench Type" fullWidth value={createValues.benchType ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, benchType: e.target.value }))} />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Case Number" fullWidth value={createValues.caseNumber ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, caseNumber: e.target.value }))} />
              <TextField label="Decision Date" fullWidth value={createValues.decisionDate ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, decisionDate: e.target.value }))} />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Petitioner" fullWidth value={createValues.petitioner ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, petitioner: e.target.value }))} />
              <TextField label="Respondent" fullWidth value={createValues.respondent ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, respondent: e.target.value }))} />
            </Box>
            <TextField label="Judges" fullWidth value={createValues.judges ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, judges: e.target.value }))} />
            <TextField label="Source URL" fullWidth value={createValues.sourceUrl ?? ""} onChange={(e) => setCreateValues((v) => ({ ...v, sourceUrl: e.target.value }))} />
            <TextField
              label="Full Judgment Text *"
              fullWidth
              multiline
              rows={14}
              value={createValues.fullContent}
              onChange={(e) => setCreateValues((v) => ({ ...v, fullContent: e.target.value }))}
              helperText="Paste the full judgment text as published by the court."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createMutation.isPending || createValues.title.trim().length < 2 || createValues.fullContent.trim().length < 10}
          >
            {createMutation.isPending ? "Saving..." : "Add Precedent"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
