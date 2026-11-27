"use client";

import type { ConsultationStatus } from "@/lib/consultations/types";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Roles } from "@/lib/consultations/types";

export type DashboardConsultation = {
  id: string;
  reason: string;
  scheduledAt: string;
  whenLabel: string;
  status: ConsultationStatus;
};

const statusBorder = {
  scheduled: "info.main",
  completed: "success.main",
  cancelled: "error.main",
} as const;

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function bySchedule(consultations: DashboardConsultation[]) {
  const rank = { scheduled: 0, completed: 1, cancelled: 2 };

  return [...consultations].sort((left, right) => {
    const status = rank[left.status] - rank[right.status];

    if (status !== 0) {
      return status;
    }

    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
  });
}

async function updateConsultation(id: string, body: Record<string, string>) {
  const response = await fetch(`/api/consultations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return;
  }

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(payload?.error ?? "Could not update the consultation");
}

export function LearningDashboard({
  role,
  firstName,
  consultations,
}: {
  role: (typeof Roles)[number];
  firstName: string;
  consultations: DashboardConsultation[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<DashboardConsultation | null>(null);
  const [when, setWhen] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DashboardConsultation | null>(null);
  const items = bySchedule(consultations);
  const upcoming = consultations.filter((item) => item.status === "scheduled").length;
  const completed = consultations.filter((item) => item.status === "completed").length;
  const cancelled = consultations.filter((item) => item.status === "cancelled").length;
  const welcome = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  // This function is used to update the consultation status.
  async function run(id: string, body: Record<string, string>) {
    setPendingId(id);
    setMessage(null);

    try {
      await updateConsultation(id, body);
      setReschedule(null);
      setRescheduleError(null);
      setCancelTarget(null);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not update the consultation";

      if (reschedule) {
        setRescheduleError(text);
        return;
      }

      setMessage(text);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Paper variant="outlined" sx={{ width: "100%", maxWidth: 760, p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography color="text.secondary">{welcome}</Typography>
        <Stack spacing={1} sx={{ alignItems: "flex-end" }}>
          <Chip
            label={role === "admin" ? "Admin" : "Student"}
            color="success"
            size="small"
          />
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ my: 3 }}>
        {[
          { value: upcoming, label: "Upcoming" },
          { value: completed, label: "Completed" },
          { value: cancelled, label: "Cancelled" },
        ].map((stat) => (
          <Stack key={stat.label} spacing={0.5} sx={{ flex: 1, alignItems: "center" }}>
            <Typography variant="h4" component="p">
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stat.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {role === "admin" ? "All consultations" : "My Consultations"}
      </Typography>

      {message ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {message}
        </Typography>
      ) : null}

      <Stack spacing={2}>
        {items.length === 0 ? (
          <Typography color="text.secondary">No consultations yet.</Typography>
        ) : (
          items.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderBottomWidth: 7,
                borderBottomStyle: "solid",
                borderBottomColor: statusBorder[item.status],
              }}
            >
              <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  {item.reason}
                </Typography>
                <Chip
                  label={item.status === "scheduled" ? "Scheduled" : item.status === "completed" ? "Completed" : "Cancelled"}
                  color={item.status === "scheduled" ? "primary" : item.status === "completed" ? "success" : "error"}
                  size="small"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {item.whenLabel}
              </Typography>
              {item.status === "scheduled" && role === "student" ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      disabled={pendingId === item.id}
                      onClick={() => run(item.id, { status: "completed" })}
                      sx={{ textTransform: "none" }}
                    >
                      Mark complete
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      disabled={pendingId === item.id}
                      onClick={() => {
                        setReschedule(item);
                        setWhen(toDatetimeLocal(item.scheduledAt));
                        setRescheduleError(null);
                        setMessage(null);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={pendingId === item.id}
                      onClick={() => {
                        setCancelTarget(item);
                        setMessage(null);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No further actions required
                </Typography>
              )}
            </Paper>
          ))
        )}
      </Stack>

      {role === "student" ? (
        <Button
          component={Link}
          href="/consultations/book"
          fullWidth
          variant="contained"
          sx={{
            mt: 2,
            py: 1.25,
            textTransform: "none",
            bgcolor: "action.hover",
            color: "text.primary",
            "&:hover": { bgcolor: "action.selected", boxShadow: "none" },
          }}
        >
          + Book a consultation
        </Button>
      ) : null}

      <Dialog
        open={reschedule !== null}
        onClose={() => {
          setReschedule(null);
          setRescheduleError(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reschedule</DialogTitle>
        <DialogContent>
          <TextField
            label="New time"
            type="datetime-local"
            value={when}
            onChange={(event) => {
              setWhen(event.target.value);
              setRescheduleError(null);
            }}
            error={rescheduleError !== null}
            helperText={rescheduleError ?? " "}
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setReschedule(null);
              setRescheduleError(null);
            }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={!reschedule || !when || pendingId === reschedule.id}
            onClick={() => {
              if (!reschedule || !when) {
                return;
              }

              const time = new Date(when);

              if (Number.isNaN(time.getTime())) {
                setRescheduleError("Enter a valid time");
                return;
              }

              if (time.getTime() <= Date.now()) {
                setRescheduleError("Consultations must be scheduled in the future");
                return;
              }

              setRescheduleError(null);
              void run(reschedule.id, { scheduledAt: time.toISOString() });
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelTarget !== null} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel this consultation?</DialogTitle>
        <DialogContent>
          <Typography>{cancelTarget?.reason}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Keep it</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!cancelTarget || pendingId === cancelTarget.id}
            onClick={() => {
              if (!cancelTarget) {
                return;
              }

              void run(cancelTarget.id, { status: "cancelled" });
            }}
          >
            Cancel consultation
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
