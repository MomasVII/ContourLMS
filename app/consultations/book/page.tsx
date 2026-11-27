"use client";

import Button from "@mui/material/Button";
import axios from "axios";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function BookConsultationPage() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      setReason("");
      setWhen("");
      setMessage(null);
      setPending(false);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const time = new Date(when);

    if (Number.isNaN(time.getTime())) {
      setMessage("Enter a valid time");
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      await axios.post("/api/consultations", {
        reason,
        scheduledAt: time.toISOString(),
      });

      setReason("");
      setWhen("");
      setMessage(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setMessage(message ?? "Could not book the consultation");
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack component="main" sx={{ flex: 1, alignItems: "center", p: { xs: 2, sm: 3 } }}>
      <Paper
        component="form"
        variant="outlined"
        onSubmit={submit}
        sx={{ width: "100%", maxWidth: 520, p: { xs: 2, sm: 3 }, borderRadius: 2 }}
      >
        <Typography variant="h5" component="h1">
          Book a consultation
        </Typography>
        <Stack spacing={2} sx={{ mt: 3 }}>
          <TextField
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label="Date and time"
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {message ? <Typography color="error">{message}</Typography> : null}
          <Button type="submit" variant="contained" disabled={pending} sx={{ textTransform: "none" }}>
            {pending ? "Booking..." : "Book consultation"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
