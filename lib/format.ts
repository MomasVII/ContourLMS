// Call this in the browser. The date is stored in UTC, and this writes it
// in the machine's own timezone, including daylight saving.
export function formatWhen(iso: string) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace("am", "AM")
    .replace("pm", "PM");

  return `${day} · ${time}`;
}
