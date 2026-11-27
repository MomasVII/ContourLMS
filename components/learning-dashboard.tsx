"use client";

import type { ConsultationStatus, Roles } from "@/lib/consultations/types";
import { formatWhen } from "@/lib/format";
import axios from "axios";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type DashboardConsultation = {
  id: string;
  reason: string;
  scheduledAt: string;
  status: ConsultationStatus;
  studentName?: string;
  studentEmail?: string;
};

const statusBorder = {
  scheduled: "info.main",
  completed: "success.main",
  cancelled: "error.main",
} as const;

function LocalWhen({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatWhen(iso));
  }, [iso]);

  return label;
}

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
  try {
    await axios.patch(`/api/consultations/${id}`, body);
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? (error.response?.data as { error?: string } | undefined)?.error
      : undefined;
    throw new Error(message ?? "Could not update the consultation");
  }
}

function listHref(page: number, status: ConsultationStatus | null) {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/?${query}` : "/";
}

export function LearningDashboard({
  role,
  firstName,
  consultations,
  counts,
  page,
  pageCount,
  status,
}: {
  role: (typeof Roles)[number];
  firstName: string;
  consultations: DashboardConsultation[];
  counts: { upcoming: number; completed: number; cancelled: number };
  page: number;
  pageCount: number;
  status: ConsultationStatus | null;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<DashboardConsultation | null>(null);
  const [when, setWhen] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DashboardConsultation | null>(null);
  const items = bySchedule(consultations);
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
      await router.refresh();
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
        {(
          [
            { status: "scheduled", value: counts.upcoming, label: "Upcoming", color: statusBorder.scheduled },
            { status: "completed", value: counts.completed, label: "Completed", color: statusBorder.completed },
            { status: "cancelled", value: counts.cancelled, label: "Cancelled", color: statusBorder.cancelled },
          ] as const
        ).map((stat) => {
          const selected = status === stat.status;

          return (
            <MuiLink
              key={stat.status}
              component={Link}
              href={listHref(1, selected ? null : stat.status)}
              underline="none"
              aria-current={selected ? "page" : undefined}
              sx={{
                flex: 1,
                color: stat.color,
                textAlign: "center",
                fontWeight: selected ? 700 : 500,
              }}
            >
              <Typography variant="h4" component="p" sx={{ color: "inherit", fontWeight: "inherit" }}>
                {stat.value}
              </Typography>
              <Typography
                variant="body2"
                component="p"
                sx={{ color: "inherit", fontWeight: "inherit", textDecoration: selected ? "underline" : "none" }}
              >
                {stat.label}
              </Typography>
            </MuiLink>
          );
        })}
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
          <Typography color="text.secondary">
            {status === "scheduled"
              ? "No upcoming consultations."
              : status === "completed"
                ? "No completed consultations."
                : status === "cancelled"
                  ? "No cancelled consultations."
                  : "No consultations yet."}
          </Typography>
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
              {role === "admin" && (item.studentName || item.studentEmail) ? (
                <Stack spacing={0.25} sx={{ mt: 1 }}>
                  {item.studentName ? (
                    <Typography variant="body2">{item.studentName}</Typography>
                  ) : null}
                  {item.studentEmail ? (
                    <MuiLink
                      href={`mailto:${encodeURIComponent(item.studentEmail)}`}
                      variant="body2"
                      color="text.secondary"
                      underline="always"
                    >
                      {item.studentEmail}
                    </MuiLink>
                  ) : null}
                </Stack>
              ) : null}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <LocalWhen iso={item.scheduledAt} />
              </Typography>
              {item.status === "scheduled" && role === "admin" && (
                <>
                  <Divider sx={{ my: 2 }} />
                  {pendingId === item.id ? (
                    <CircularProgress size={22} aria-label="Marking complete" />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => run(item.id, { status: "completed" })}
                      sx={{ textTransform: "none" }}
                    >
                      Mark complete
                    </Button>
                  )}
                </>
              )}
              {item.status === "scheduled" && role === "student" && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
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
              )}
            </Paper>
          ))
        )}
      </Stack>

      {pageCount > 1 ? (
        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center", justifyContent: "space-between" }}>
          {page > 1 ? (
            <Button component={Link} href={listHref(page - 1, status)} sx={{ textTransform: "none" }}>
              Previous
            </Button>
          ) : (
            <Button disabled sx={{ textTransform: "none" }}>
              Previous
            </Button>
          )}
          <Typography variant="body2" color="text.secondary">
            Page {page} of {pageCount}
          </Typography>
          {page < pageCount ? (
            <Button component={Link} href={listHref(page + 1, status)} sx={{ textTransform: "none" }}>
              Next
            </Button>
          ) : (
            <Button disabled sx={{ textTransform: "none" }}>
              Next
            </Button>
          )}
        </Stack>
      ) : null}

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
