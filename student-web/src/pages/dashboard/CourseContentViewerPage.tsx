import { VideoPlayer } from '../../components/VideoPlayer';
import { useParams } from "react-router-dom";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { courseContentApi } from "../../api/courseContent.api";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../../store/authStore";

export function CourseContentViewerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: contents, isLoading, error } = useQuery({
    queryKey: ["course-content", courseId],
    queryFn: () => courseContentApi.forCourse(courseId as string),
    enabled: !!courseId,
  });

  // Group by term so students see their material organized the way it was
  // uploaded (e.g. "Semester 1", "Semester 2") rather than a flat list.
  const grouped = (contents ?? []).reduce<Record<string, typeof contents>>((acc, c) => {
    (acc[c.term] ||= []).push(c);
    return acc;
  }, {});

  const viewFile = (id: string) => {
    const base = apiClient.defaults.baseURL;
    const token = useAuthStore.getState().accessToken || "";
    window.open(`${base}/course-content/${id}/file?token=${encodeURIComponent(token)}`, "_blank");
  };

  if (isLoading) return <Typography variant="body2">Loading...</Typography>;
  if (error)
    return (
      <Typography variant="body2" color="error">
        {(error as any)?.response?.data?.message || "You need an active subscription to view this course's content."}
      </Typography>
    );

  return (
    <Box
      sx={{ maxWidth: 800, mx: "auto", userSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Course Content
      </Typography>

      {Object.keys(grouped).length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No content has been uploaded for this course yet.
        </Typography>
      )}

      {Object.entries(grouped).map(([term, items]) => (
        <Box key={term} sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            {term}
          </Typography>
          {items!.map((c) => (
            <Paper
              key={c.id}
              elevation={0}
              sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 2, mb: 1, cursor: c.fileType !== "TEXT" ? "pointer" : "default" }}
              onClick={() => c.fileType !== "TEXT" && viewFile(c.id)}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {c.title}
                    {c.subject && <Chip label={c.subject.name} size="small" variant="outlined" sx={{ ml: 1 }} />}
                  </Typography>
                  {c.fileType === "TEXT" ? (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                      {c.textBody}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {c.fileType} — Tap to view
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ))}
    </Box>
  );
}
