import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { accountingApi } from "../../api/accounting.api";
import { liveClassInstitutionApi } from "../../api/liveClassInstitution.api";
import { resolveMediaUrl } from "../../api/client";
import { PersonSearchSelect } from "../../components/accounting/PersonSearchSelect";

export function AccountingPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Accounting
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Fees & Discounts" />
        <Tab label="Payments" />
        <Tab label="Payment QR Code" />
        <Tab label="Staff Payroll" />
      </Tabs>

      {tab === 0 && <FeesDiscountsTab />}
      {tab === 1 && <PaymentsTab />}
      {tab === 2 && <QrCodeTab />}
      {tab === 3 && <StaffPayrollTab />}
    </Box>
  );
}

// ---------------- Fees & Discounts ----------------
function FeesDiscountsTab() {
  const [courseId, setCourseId] = useState("");
  const { data: courses } = useQuery({ queryKey: ["institution-courses"], queryFn: () => liveClassInstitutionApi.courses() });
  const qc = useQueryClient();

  const { data: fee } = useQuery({ queryKey: ["accounting-fee", courseId], queryFn: () => accountingApi.getFee(courseId), enabled: !!courseId });
  const { data: discounts } = useQuery({ queryKey: ["accounting-discounts", courseId], queryFn: () => accountingApi.listDiscounts(courseId), enabled: !!courseId });

  const [feeAmount, setFeeAmount] = useState("");
  const saveFee = useMutation({
    mutationFn: () => accountingApi.setFee(courseId, Number(feeAmount)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting-fee", courseId] }),
  });

  const [discStudentId, setDiscStudentId] = useState("");
  const [discType, setDiscType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discValue, setDiscValue] = useState("");
  const [discReason, setDiscReason] = useState("");
  const grantDiscount = useMutation({
    mutationFn: () =>
      accountingApi.grantDiscount({ studentId: discStudentId, courseId, type: discType, value: Number(discValue), reason: discReason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting-discounts", courseId] });
      setDiscStudentId("");
      setDiscValue("");
      setDiscReason("");
    },
  });

  const removeDiscount = useMutation({
    mutationFn: (studentId: string) => accountingApi.removeDiscount(studentId, courseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting-discounts", courseId] }),
  });

  return (
    <Box sx={{ maxWidth: 700 }}>
      <TextField select label="Course" size="small" value={courseId} onChange={(e) => setCourseId(e.target.value)} sx={{ minWidth: 260, mb: 3 }}>
        <MenuItem value="">Select a course</MenuItem>
        {courses?.map((c: any) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {courseId && (
        <>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Course Fee {fee && `(current: NPR ${fee.amount})`}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Fee Amount (NPR)"
                type="number"
                size="small"
                fullWidth
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
              <Button variant="contained" onClick={() => saveFee.mutate()} disabled={saveFee.isPending || !feeAmount}>
                Save
              </Button>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Grant Discount
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
              <PersonSearchSelect label="Student" searchFn={accountingApi.searchStudents} onSelect={(id) => setDiscStudentId(id ?? "")} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField select label="Type" size="small" fullWidth value={discType} onChange={(e) => setDiscType(e.target.value as any)}>
                  <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                  <MenuItem value="FIXED_AMOUNT">Fixed Amount (NPR)</MenuItem>
                </TextField>
                <TextField label="Value" type="number" size="small" fullWidth value={discValue} onChange={(e) => setDiscValue(e.target.value)} />
              </Box>
              <TextField
                label="Reason (e.g. Sibling discount, Scholarship)"
                size="small"
                fullWidth
                value={discReason}
                onChange={(e) => setDiscReason(e.target.value)}
              />
              <Button variant="contained" onClick={() => grantDiscount.mutate()} disabled={grantDiscount.isPending || !discStudentId || !discValue}>
                Grant Discount
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {discounts?.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.student?.fullName ?? d.studentId}</TableCell>
                    <TableCell>{d.type === "PERCENTAGE" ? `${d.value}%` : `NPR ${d.value}`}</TableCell>
                    <TableCell>{d.reason ?? "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => removeDiscount.mutate(d.studentId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}

// ---------------- Payments ----------------
function PaymentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: summary } = useQuery({ queryKey: ["accounting-summary"], queryFn: () => accountingApi.getSummary() });
  const { data: transactions } = useQuery({ queryKey: ["accounting-transactions", search], queryFn: () => accountingApi.listTransactions(search || undefined) });

  const [payStudentId, setPayStudentId] = useState("");
  const [payCourseId, setPayCourseId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payReceipt, setPayReceipt] = useState("");
  const record = useMutation({
    mutationFn: () =>
      accountingApi.recordManualPayment({
        studentId: payStudentId,
        courseId: payCourseId,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        receiptNumber: payReceipt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting-transactions"] });
      setPayStudentId("");
      setPayCourseId("");
      setPayAmount("");
      setPayReceipt("");
    },
  });

  return (
    <Box>
      {summary && (
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Total Collected</Typography>
            <Typography variant="h6" fontWeight={700}>NPR {summary.totalCollected.toLocaleString()}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">This Month</Typography>
            <Typography variant="h6" fontWeight={700}>NPR {summary.thisMonthCollected.toLocaleString()}</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Pending Payments</Typography>
            <Typography variant="h6" fontWeight={700}>{summary.pendingCount}</Typography>
          </Paper>
        </Box>
      )}
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3, maxWidth: 700 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Record a Payment (Cash / Bank Transfer / QR Scan)
        </Typography>
        {record.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment recorded — subscription activated.
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <PersonSearchSelect label="Student" searchFn={accountingApi.searchStudents} onSelect={(id) => setPayStudentId(id ?? "")} />
            <TextField label="Course ID (UUID)" size="small" fullWidth value={payCourseId} onChange={(e) => setPayCourseId(e.target.value)} />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Amount (NPR)" type="number" size="small" fullWidth value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <TextField select label="Method" size="small" fullWidth value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="QR_SCAN">QR Scan</MenuItem>
            </TextField>
          </Box>
          <TextField label="Receipt Number (optional)" size="small" fullWidth value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} />
          <Button
            variant="contained"
            onClick={() => record.mutate()}
            disabled={record.isPending || !payStudentId || !payCourseId || !payAmount}
          >
            Record Payment
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <TextField
          label="Search by name, email, or phone"
          size="small"
          fullWidth
          sx={{ maxWidth: 400 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={async () => {
            const url = await accountingApi.exportTransactionsUrl(search || undefined);
            window.open(url, "_blank");
          }}
        >
          Export Excel
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E5E7EB" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Gateway</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions?.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{t.student?.fullName}</TableCell>
                <TableCell>{t.course?.name}</TableCell>
                <TableCell>NPR {t.amount}</TableCell>
                <TableCell>{t.gateway}</TableCell>
                <TableCell>{t.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ---------------- QR Code ----------------
function QrCodeTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-qr-code"], queryFn: () => accountingApi.getMyQrCode() });
  const upload = useMutation({
    mutationFn: (file: File) => accountingApi.uploadQrCode(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-qr-code"] }),
  });

  return (
    <Box sx={{ maxWidth: 500 }}>
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Payment QR Code
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload your bank/wallet QR code — students will see this when paying, scan it with their banking app, and
          your staff can confirm the payment afterward in the Payments tab.
        </Typography>
        {data?.paymentQrCodeUrl && (
          <Box sx={{ mb: 2 }}>
            <img
              src={resolveMediaUrl(data.paymentQrCodeUrl) ?? undefined}
              alt="Payment QR"
              style={{ maxWidth: 200, border: "1px solid #E5E7EB", borderRadius: 8 }}
            />
          </Box>
        )}
        <Button variant="outlined" component="label">
          {data?.paymentQrCodeUrl ? "Replace QR Code" : "Upload QR Code"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
        </Button>
      </Paper>
    </Box>
  );
}

// ---------------- Staff Payroll ----------------
function StaffPayrollTab() {
  const qc = useQueryClient();
  const { data: salaries } = useQuery({ queryKey: ["staff-salaries"], queryFn: () => accountingApi.listStaffSalaries() });
  const [search, setSearch] = useState("");
  const { data: payments } = useQuery({ queryKey: ["staff-payments", search], queryFn: () => accountingApi.listStaffPayments(search || undefined) });

  const [salStaffId, setSalStaffId] = useState("");
  const [salCategory, setSalCategory] = useState("");
  const [salType, setSalType] = useState("FIXED_MONTHLY");
  const [salAmount, setSalAmount] = useState("");
  const setSalary = useMutation({
    mutationFn: () => accountingApi.setStaffSalary({ staffId: salStaffId, category: salCategory, salaryType: salType, amount: Number(salAmount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-salaries"] });
      setSalStaffId("");
      setSalCategory("");
      setSalAmount("");
    },
  });

  const [payStaffId, setPayStaffId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const recordPayment = useMutation({
    mutationFn: () =>
      accountingApi.recordStaffPayment({ staffId: payStaffId, amount: Number(payAmount), paidForPeriod: payPeriod || undefined, paymentMethod: payMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-payments"] });
      setPayStaffId("");
      setPayAmount("");
      setPayPeriod("");
    },
  });

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3, maxWidth: 700 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Set Staff Salary
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PersonSearchSelect label="Staff Member" searchFn={accountingApi.searchStaff} onSelect={(id) => setSalStaffId(id ?? "")} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Category (e.g. Teacher, Admin)" size="small" fullWidth value={salCategory} onChange={(e) => setSalCategory(e.target.value)} />
            <TextField select label="Salary Type" size="small" fullWidth value={salType} onChange={(e) => setSalType(e.target.value)}>
              <MenuItem value="FIXED_MONTHLY">Fixed Monthly</MenuItem>
              <MenuItem value="PER_CLASS">Per Class</MenuItem>
              <MenuItem value="HOURLY">Hourly</MenuItem>
            </TextField>
          </Box>
          <TextField label="Amount (NPR)" type="number" size="small" value={salAmount} onChange={(e) => setSalAmount(e.target.value)} />
          <Button variant="contained" onClick={() => setSalary.mutate()} disabled={setSalary.isPending || !salStaffId || !salCategory || !salAmount}>
            Save Salary Record
          </Button>
        </Box>

        <Table size="small" sx={{ mt: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Staff</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {salaries?.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.staff?.fullName}</TableCell>
                <TableCell>{s.category}</TableCell>
                <TableCell>{s.salaryType}</TableCell>
                <TableCell>NPR {s.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3, maxWidth: 700 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Record Staff Payment
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PersonSearchSelect label="Staff Member" searchFn={accountingApi.searchStaff} onSelect={(id) => setPayStaffId(id ?? "")} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Amount (NPR)" type="number" size="small" fullWidth value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <TextField
              label="For Period (e.g. 2026-08)"
              size="small"
              fullWidth
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
            />
          </Box>
          <TextField select label="Method" size="small" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            <MenuItem value="QR_SCAN">QR Scan</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !payStaffId || !payAmount}>
            Record Payment
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField label="Search by name, email, or phone" size="small" fullWidth sx={{ maxWidth: 400 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={async () => {
            const url = await accountingApi.exportStaffPaymentsUrl(search || undefined);
            window.open(url, "_blank");
          }}
        >
          Export Excel
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E5E7EB" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Method</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{p.staffSalary?.staff?.fullName}</TableCell>
                <TableCell>{p.staffSalary?.category}</TableCell>
                <TableCell>NPR {p.amount}</TableCell>
                <TableCell>{p.paidForPeriod ?? "—"}</TableCell>
                <TableCell>{p.paymentMethod}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
