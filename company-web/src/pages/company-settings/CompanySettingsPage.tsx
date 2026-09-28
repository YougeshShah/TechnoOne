import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Typography, Paper, Button } from "@mui/material";
import { companySettingsApi, getQrCodeImageUrl } from "../../api/companySettings.api";

export function CompanySettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company-qr-code"], queryFn: () => companySettingsApi.getQrCode() });
  const upload = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadQrCode(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-qr-code"] }),
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Company Settings
      </Typography>

      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, maxWidth: 500 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Company Payment QR Code
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload TechnoOne's own bank/wallet QR code. Students who don't belong to any institution (direct
          students) will see this QR when paying by voucher upload -- they scan it to pay, then upload their
          proof for you to review.
        </Typography>
        {data?.paymentQrCodeUrl && (
          <Box sx={{ mb: 2 }}>
            <img
              src={getQrCodeImageUrl(data.paymentQrCodeUrl)}
              alt="Company Payment QR"
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
