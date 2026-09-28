import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Chip, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseApi } from "../../api/course.api";
import { paymentVoucherApi } from "../../api/paymentVoucher.api";
import { institutionFeeApi } from "../../api/institutionFee.api";
import { resolveMediaUrl } from "../../api/client";

const STATUS_COLOR: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

export function PaymentVoucherPage() {
  const [searchParams] = useSearchParams();
  const [courseId, setCourseId] = useState(searchParams.get("courseId") || "");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: () => courseApi.list() });
  const { data: myVouchers } = useQuery({ queryKey: ["my-vouchers"], queryFn: () => paymentVoucherApi.myVouchers() });
  const { data: qrCode } = useQuery({ queryKey: ["my-payment-qr"], queryFn: () => institutionFeeApi.myQrCode() });

  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: () => paymentVoucherApi.upload(courseId, file as File, amount ? Number(amount) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vouchers"] });
      setCourseId("");
      setAmount("");
      setFile(null);
    },
  });

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Upload Payment Voucher
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        If you paid by bank transfer or cash, upload your receipt here. Your institution will review it and grant
        access to that specific course once approved.
      </Typography>

      {qrCode?.paymentQrCodeUrl && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3, textAlign: "center" }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Scan to Pay
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Scan this QR code with your banking app, pay the course amount, then upload your proof below.
          </Typography>
          <img
            src={resolveMediaUrl(qrCode.paymentQrCodeUrl) ?? undefined}
            alt="Payment QR"
            style={{ maxWidth: 220, borderRadius: 8, border: "1px solid #E5E7EB" }}
          />
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 4 }}>
        {upload.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(upload.error as any)?.response?.data?.message || "Could not submit voucher. Please try again."}
          </Alert>
        )}
        {upload.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Voucher submitted — waiting for your institution's approval.
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField select label="Course" size="small" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses?.map((c: any) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Amount Paid (optional)"
            type="number"
            size="small"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button variant="outlined" component="label" size="small">
            {file ? file.name : "Choose Receipt (Image or PDF)"}
            <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Button>
          <Button
            variant="contained"
            onClick={() => upload.mutate()}
            disabled={!courseId || !file || upload.isPending}
          >
            {upload.isPending ? "Submitting..." : "Submit Voucher"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        My Vouchers
      </Typography>
      {(myVouchers ?? []).map((v) => (
        <Paper key={v.id} elevation={0} sx={{ p: 2, border: "1px solid #E5E7EB", borderRadius: 2, mb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {v.course.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted {new Date(v.submittedAt).toLocaleDateString()}
              </Typography>
              {v.status === "REJECTED" && v.rejectionReason && (
                <Typography variant="caption" color="error" sx={{ display: "block" }}>
                  Reason: {v.rejectionReason}
                </Typography>
              )}
            </Box>
            <Chip label={v.status} size="small" color={STATUS_COLOR[v.status]} />
          </Box>
        </Paper>
      ))}
      {(myVouchers ?? []).length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No vouchers submitted yet.
        </Typography>
      )}
    </Box>
  );
}
