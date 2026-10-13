import sys

path = "src/pages/live-classes/LiveClassesPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

patches = []

old1 = '''import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useForm } from "react-hook-form";
import { liveClassInstitutionApi } from "../../api/liveClassInstitution.api";
import { userApi } from "../../api/user.api";'''

new1 = '''import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useForm } from "react-hook-form";
import { liveClassInstitutionApi } from "../../api/liveClassInstitution.api";
import { userApi } from "../../api/user.api";
import { lawFirmSettingsApi } from "../../api/lawFirmSettings.api";'''

patches.append(("imports", old1, new1))

old2 = '''  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const hostJoin = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.hostJoin(id) });'''

new2 = '''  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const hostJoin = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.hostJoin(id) });

  const { data: institutionSettings } = useQuery({
    queryKey: ["institution-settings"],
    queryFn: () => lawFirmSettingsApi.getMine(),
  });
  const updateSettings = useMutation({
    mutationFn: (allowRecordingScreenshots: boolean) => lawFirmSettingsApi.updateMine({ allowRecordingScreenshots }),
    onSuccess: (data) => qc.setQueryData(["institution-settings"], data),
  });'''

patches.append(("settings query/mutation", old2, new2))

old3 = '''      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Classes you schedule here are visible only to your own students — not to other institutions' students, even
        for the same course.
      </Typography>'''

new3 = '''      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Classes you schedule here are visible only to your own students — not to other institutions' students, even
        for the same course.
      </Typography>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", p: 2, mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Allow screenshots on class recordings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            By default, students can't screenshot or screen-record your class recordings while watching them in the
            app. Turn this on to allow it for your institution's students.
          </Typography>
        </Box>
        <Switch
          checked={institutionSettings?.allowRecordingScreenshots ?? false}
          disabled={!institutionSettings || updateSettings.isPending}
          onChange={(e) => updateSettings.mutate(e.target.checked)}
        />
      </Paper>'''

patches.append(("screenshot toggle card", old3, new3))

for name, old, new in patches:
    c = content.count(old)
    print(f"{name} anchor count = {c}")
    if c != 1:
        print(f"ERROR: aborting at '{name}'.")
        sys.exit(1)
    content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched src/pages/live-classes/LiveClassesPage.tsx (recording-screenshot permission toggle)")
